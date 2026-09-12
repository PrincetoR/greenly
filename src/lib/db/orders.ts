import 'server-only';
import type { Order, OrderStatus } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'orders';

export async function listOrders(opts: { status?: OrderStatus } = {}): Promise<Order[]> {
  const items = await readCollection<Order>(NAME);
  return items
    .filter((o) => !opts.status || o.status === opts.status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findOrder(id: string): Promise<Order | undefined> {
  return (await readCollection<Order>(NAME)).find((o) => o.id === id);
}

export async function findOrderByNo(orderNo: string): Promise<Order | undefined> {
  return (await readCollection<Order>(NAME)).find((o) => o.orderNo === orderNo);
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
