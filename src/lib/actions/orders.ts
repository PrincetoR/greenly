'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { findOrder, listOrders, updateOrder, withEvent } from '@/lib/db/orders';
import { restoreStock } from '@/lib/db/products';
import { nowIso } from '@/lib/db/store';
import { getSettings, saveSettings } from '@/lib/db/settings';
import { NEXT_STATUS, ORDER_STATUS_LABEL } from '@/lib/orders/labels';
import { carrierById, isCarrierId } from '@/lib/shipping/carriers';
import { isMockDelivered } from '@/lib/shipping/tracking';
import { refundPayment } from '@/lib/payments/service';
import { updatePayment } from '@/lib/db/payments';
import type { Order, OrderStatus } from '@/lib/types';

/**
 * เปลี่ยนสถานะออเดอร์ (ปุ่มในหน้ารายละเอียด/หน้าจัดส่ง) — ตรวจ transition · เก็บ history · ผลข้างเคียงต่อสถานะ:
 *  shipped   ต้องมีขนส่ง+เลขพัสดุ (form) · done ปิด COD ว่าเก็บเงินแล้ว · returned ต้องมีเหตุผล
 *  cancelled คืน stock · ถ้าจ่ายผ่าน Beam แล้ว → คืนเงินเต็มจำนวน (mock)
 */
export async function changeOrderStatus(formData: FormData): Promise<void> {
  const session = await requirePermission('order.manage');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OrderStatus;
  const back = String(formData.get('back') ?? `/admin/orders/${id}`);
  const order = await findOrder(id);
  if (!order) redirect('/admin/orders');
  // เปลี่ยนได้เฉพาะสถานะถัดไปที่กำหนด — กันกดผิดหรือยิง POST ตรง ๆ
  if (!NEXT_STATUS[order.status].includes(status)) redirect(withQuery(back, 'error=transition'));

  const by = session.user.username;
  const note = String(formData.get('note') ?? '').trim();
  let shipment = order.shipment;

  if (status === 'shipped') {
    const carrier = String(formData.get('carrier') ?? '');
    const trackingNo = String(formData.get('trackingNo') ?? '').trim().toUpperCase();
    if (!isCarrierId(carrier) || !/^[A-Z0-9-]{6,30}$/.test(trackingNo)) redirect(withQuery(back, 'error=tracking'));
    const weight = Number.parseInt(String(formData.get('weightGrams') ?? ''), 10);
    shipment = {
      carrier,
      trackingNo,
      shippedAt: nowIso(),
      deliveredAt: null,
      returnedAt: null,
      returnReason: null,
      weightGrams: Number.isInteger(weight) && weight > 0 ? weight : (order.shipment?.weightGrams ?? null),
      boxSize: String(formData.get('boxSize') ?? '').trim() || order.shipment?.boxSize || null,
      note,
    };
  }
  if (status === 'returned') {
    if (!note) redirect(withQuery(back, 'error=reason'));
    shipment = order.shipment ? { ...order.shipment, returnedAt: nowIso(), returnReason: note } : null;
  }
  if (status === 'done' && shipment) shipment = { ...shipment, deliveredAt: nowIso() };

  // "ยืนยันรับชำระเอง" (Beam ยังไม่ส่งผลมา แต่เช็คในแดชบอร์ด Beam แล้วว่าเงินเข้า) → ปิดรายการชำระให้ตรงกัน
  const manualPaid = status === 'paid' && order.payment?.provider === 'beam' && order.payment.status !== 'succeeded';
  if (manualPaid && order.payment?.paymentId) {
    await updatePayment(order.payment.paymentId, (p) => ({ ...p, status: 'succeeded', paidAt: nowIso(), net: p.amount - p.fee, reference: p.reference ?? `manual-${by}` }));
  }

  await updateOrder(id, (o) => {
    let next: Order = { ...o, status, shipment };
    if (manualPaid && next.payment) next = { ...next, payment: { ...next.payment, status: 'succeeded', paidAt: nowIso() } };
    // COD: เงินเข้าเมื่อของถึงมือ
    if (status === 'done' && next.payment?.provider === 'cod') next = { ...next, payment: { ...next.payment, status: 'succeeded', paidAt: nowIso() } };
    if (status === 'cancelled' && next.payment?.provider === 'cod') next = { ...next, payment: { ...next.payment, status: 'failed' } };
    const text =
      status === 'shipped' && shipment
        ? `ส่งกับ ${carrierById(shipment.carrier).name} เลขพัสดุ ${shipment.trackingNo}${note ? ` · ${note}` : ''}`
        : status === 'returned'
          ? `พัสดุตีกลับ — ${note}`
          : status === 'packing' && o.status === 'returned'
            ? `ส่งใหม่ — เริ่มแพ็คอีกครั้ง${note ? ` · ${note}` : ''}`
            : manualPaid
              ? `ยืนยันรับชำระเอง (ตรวจจาก Beam แล้ว)${note ? ` · ${note}` : ''}`
              : `${ORDER_STATUS_LABEL[status]}${note ? ` · ${note}` : ''}`;
    return withEvent(next, status, by, text);
  });

  if (status === 'cancelled') {
    // ยกเลิก → คืน stock ทั้งหมดรวมของแถม · สิทธิ์โปรคืนเองเพราะ usage นับเฉพาะ order ที่ไม่ cancelled
    await restoreStock(order.lines.map((l) => ({ productId: l.productId, qty: l.qty })));
    // จ่ายผ่าน Beam แล้ว → คืนเงินเต็มจำนวนอัตโนมัติ (mock — ของจริงเรียก Refund API)
    if (order.payment?.provider === 'beam' && order.payment.paymentId && (order.payment.status === 'succeeded' || order.payment.status === 'partially_refunded')) {
      await refundPayment(order.payment.paymentId, order.payment.amount - order.payment.refundedAmount, 'ยกเลิกคำสั่งซื้อ', by);
    }
  }
  revalidatePath('/', 'layout');
  redirect(withQuery(back, 'updated=1'));
}

/** เพิ่มโน้ตภายใน (ไม่เปลี่ยนสถานะ) */
export async function addOrderNote(formData: FormData): Promise<void> {
  const session = await requirePermission('order.manage');
  const id = String(formData.get('id') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (note) await updateOrder(id, (o) => withEvent(o, 'note', session.user.username, note));
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${id}?updated=1`);
}

/** ทำหลายใบพร้อมกันจากหน้าจัดส่ง: เริ่มแพ็คที่เลือก */
export async function bulkStartPacking(formData: FormData): Promise<void> {
  const session = await requirePermission('order.manage');
  const ids = formData.getAll('ids').map(String);
  let n = 0;
  for (const id of ids) {
    const o = await findOrder(id);
    if (!o || !NEXT_STATUS[o.status].includes('packing')) continue;
    await updateOrder(id, (x) => withEvent({ ...x, status: 'packing' }, 'packing', session.user.username, 'เริ่มแพ็ค (เลือกหลายใบ)'));
    n += 1;
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/shipping?tab=packing&bulk=${n}`);
}

/**
 * "ซิงก์สถานะพัสดุ" (จำลอง) — ของจริงจะเป็น cron/webhook จากขนส่ง
 * ออเดอร์ที่ส่งไปเกินเวลาที่ mock ถือว่าถึงมือลูกค้า → done (+ COD เก็บเงินแล้ว)
 */
export async function syncTrackingMock(): Promise<void> {
  await requirePermission('order.manage');
  const orders = await listOrders({ status: 'shipped' });
  const now = new Date();
  let n = 0;
  for (const o of orders) {
    if (!isMockDelivered(o, now)) continue;
    await updateOrder(o.id, (x) => {
      const at = nowIso();
      let next: Order = { ...x, status: 'done', shipment: x.shipment ? { ...x.shipment, deliveredAt: at } : x.shipment };
      if (next.payment?.provider === 'cod') next = { ...next, payment: { ...next.payment, status: 'succeeded', paidAt: at } };
      return withEvent(next, 'done', 'system', 'ขนส่งยืนยันจัดส่งสำเร็จ (ซิงก์อัตโนมัติ)');
    });
    n += 1;
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/shipping?tab=shipped&synced=${n}`);
}

/** ตั้งค่าการจัดส่ง (ผู้ส่งบนใบปะหน้า · ขนส่งที่ใช้) */
export async function updateShippingSettings(formData: FormData): Promise<void> {
  await requirePermission('settings.manage');
  const carriers = formData.getAll('carriers').map(String).filter(isCarrierId);
  const defaultCarrier = String(formData.get('defaultCarrier') ?? '');
  const current = (await getSettings()).shipping;
  await saveSettings({
    shipping: {
      senderName: String(formData.get('senderName') ?? '').trim() || current.senderName,
      senderPhone: String(formData.get('senderPhone') ?? '').trim(),
      senderAddress: String(formData.get('senderAddress') ?? '').trim(),
      carriers: carriers.length ? carriers : current.carriers,
      defaultCarrier: isCarrierId(defaultCarrier) && carriers.includes(defaultCarrier) ? defaultCarrier : (carriers[0] ?? current.defaultCarrier),
    },
  });
  revalidatePath('/admin', 'layout');
  redirect('/admin/shipping?tab=settings&saved=1');
}

function withQuery(path: string, q: string): string {
  return `${path}${path.includes('?') ? '&' : '?'}${q}`;
}
