import 'server-only';
import type { Order, OrderEvent, OrderStatus } from '@/lib/types';
import { normalizeCustomerKey } from '@/lib/pricing/usage';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'orders';

/** order รุ่นแรกไม่มี guestIds/payment/shipment/history — เติมให้ตอนอ่านเพื่อไม่ต้อง migrate ไฟล์ */
function normalize(o: Order): Order {
  return { ...o, guestIds: o.guestIds ?? [], payment: o.payment ?? null, shipment: o.shipment ?? null, history: o.history ?? [] };
}
async function readOrders(): Promise<Order[]> {
  return (await readCollection<Order>(NAME)).map(normalize);
}

/** แก้ order หนึ่งใบแบบ atomic (ผ่าน write queue) — ทุกการเปลี่ยนสถานะ/ชำระ/จัดส่งใช้ตัวนี้ */
export async function updateOrder(id: string, fn: (order: Order) => Order): Promise<Order | undefined> {
  let updated: Order | undefined;
  await updateCollection<Order>(NAME, (items) =>
    items.map((o) => {
      if (o.id !== id) return o;
      updated = { ...fn(normalize(o)), updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}

/** เพิ่มเหตุการณ์ในไทม์ไลน์ของออเดอร์ (ใช้ร่วมกับ updateOrder) */
export function withEvent(order: Order, type: OrderEvent['type'], by: string, note: string): Order {
  return { ...order, history: [...order.history, { at: nowIso(), type, by, note }] };
}

export async function listOrders(opts: { status?: OrderStatus } = {}): Promise<Order[]> {
  const items = await readOrders();
  return items
    .filter((o) => !opts.status || o.status === opts.status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** คำสั่งซื้อของลูกค้าคนนี้ (guest id) ล่าสุดก่อน */
export async function listOrdersByGuest(guestId: string): Promise<Order[]> {
  return (await readOrders()).filter((o) => o.guestIds.includes(guestId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findOrder(id: string): Promise<Order | undefined> {
  return (await readOrders()).find((o) => o.id === id);
}

export async function findOrderByNo(orderNo: string): Promise<Order | undefined> {
  const needle = orderNo.trim().toUpperCase();
  return (await readOrders()).find((o) => o.orderNo === needle);
}

/**
 * ผูก order เข้ากับ guest id ปัจจุบัน เมื่อพิสูจน์ได้ว่ารู้เบอร์โทรที่ใช้สั่ง
 * = วิธี "เข้าถึงออเดอร์เก่าจากเครื่องอื่น" โดยไม่ต้องมีบัญชี · คืน order ถ้าสำเร็จ
 */
export async function claimOrder(orderNo: string, phone: string, guestId: string): Promise<Order | undefined> {
  const key = normalizeCustomerKey(phone);
  if (!key) return undefined;
  let claimed: Order | undefined;
  await updateCollection<Order>(NAME, (items) =>
    items.map((o) => {
      if (o.orderNo !== orderNo.trim().toUpperCase() || normalizeCustomerKey(o.customer.phone) !== key) return o;
      const guestIds = o.guestIds ?? [];
      claimed = guestIds.includes(guestId) ? { ...o, guestIds } : { ...o, guestIds: [...guestIds, guestId], updatedAt: nowIso() };
      return claimed;
    }),
  );
  return claimed;
}

/** เลขที่ order อ่านง่าย: OD-20260912-0007 (running ต่อวัน) */
function nextOrderNo(existing: Order[], now: Date): string {
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `OD-${ymd}-`;
  const todayCount = existing.filter((o) => o.orderNo.startsWith(prefix)).length;
  return `${prefix}${String(todayCount + 1).padStart(4, '0')}`;
}

export async function createOrder(
  input: Omit<Order, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>,
): Promise<Order> {
  let created!: Order;
  await updateCollection<Order>(NAME, (items) => {
    const now = new Date();
    created = {
      id: newId('o'),
      orderNo: nextOrderNo(items, now),
      ...input,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    return [...items, created];
  });
  return created;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | undefined> {
  let updated: Order | undefined;
  await updateCollection<Order>(NAME, (items) =>
    items.map((o) => {
      if (o.id !== id) return o;
      updated = { ...o, status, updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}
