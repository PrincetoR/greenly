import 'server-only';
import type { Order, Payment, PaymentStatus } from '@/lib/types';
import { createPayment, findPayment, updatePayment } from '@/lib/db/payments';
import { updateOrder, withEvent } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { nowIso } from '@/lib/db/store';
import { beamFee, mockReference, type BeamChannelId } from './beam';
import { PAYMENT_CHANNEL_LABEL } from '@/lib/orders/labels';

/**
 * ชั้นเชื่อม Beam (mock) — ของจริงจะเรียก API สร้าง checkout session แล้วรอ webhook
 * ที่นี่: สร้างรายการ pending → หน้า /pay/[id] ให้ลูกค้า "จำลอง" ผล → settle เขียนผลลง ledger + order เหมือน webhook เข้า
 */
export async function startBeamPayment(order: Order): Promise<Payment> {
  const { payments } = await getSettings();
  const expiresAt = new Date(Date.now() + payments.beam.expiryMinutes * 60_000).toISOString();
  const payment = await createPayment({
    orderId: order.id,
    orderNo: order.orderNo,
    provider: 'beam',
    channel: null,
    amount: order.total,
    fee: 0,
    net: 0,
    status: 'pending',
    reference: null,
    installmentTerm: null,
    customer: { name: order.customer.name, phone: order.customer.phone },
    refunds: [],
    paidAt: null,
    expiresAt,
  });
  await updateOrder(order.id, (o) => ({
    ...o,
    payment: { provider: 'beam', channel: null, paymentId: payment.id, status: 'pending', amount: order.total, fee: 0, paidAt: null, refundedAmount: 0 },
  }));
  return payment;
}

export function isExpired(p: Payment, now = new Date()): boolean {
  return p.status === 'pending' && new Date(p.expiresAt) <= now;
}

/** ผลการชำระจากหน้า Beam (mock) — เทียบ webhook `payment.succeeded` / `payment.failed` */
export async function settleMockPayment(paymentId: string, channel: BeamChannelId, outcome: 'succeeded' | 'failed', installmentTerm: number | null): Promise<Payment | undefined> {
  const existing = await findPayment(paymentId);
  if (!existing || existing.status !== 'pending') return existing;
  if (isExpired(existing)) {
    await updatePayment(paymentId, (p) => ({ ...p, status: 'expired' }));
    await updateOrder(existing.orderId, (o) => (o.payment?.paymentId === paymentId ? { ...o, payment: { ...o.payment, status: 'expired' } } : o));
    return { ...existing, status: 'expired' };
  }
  const fee = outcome === 'succeeded' ? beamFee(channel, existing.amount) : 0;
  const paidAt = outcome === 'succeeded' ? nowIso() : null;
  const reference = mockReference(`${paymentId}-${outcome}`);
  const payment = await updatePayment(paymentId, (p) => ({ ...p, channel, installmentTerm, status: outcome, fee, net: outcome === 'succeeded' ? p.amount - fee : 0, paidAt, reference }));
  await updateOrder(existing.orderId, (o) => {
    const summary = { provider: 'beam' as const, channel, paymentId, status: outcome as PaymentStatus, amount: existing.amount, fee, paidAt, refundedAmount: 0 };
    if (outcome !== 'succeeded') return withEvent({ ...o, payment: summary }, 'payment', 'system', `ชำระผ่าน Beam (${PAYMENT_CHANNEL_LABEL[channel]}) ไม่สำเร็จ`);
    // จ่ายสำเร็จ → ออเดอร์เข้าคิวแพ็ค (เฉพาะที่ยังรอชำระ — กันจ่ายซ้ำ)
    const next = { ...o, payment: summary, status: o.status === 'pending' ? ('paid' as const) : o.status };
    return withEvent(next, 'paid', 'system', `ชำระผ่าน Beam (${PAYMENT_CHANNEL_LABEL[channel]}${installmentTerm ? ` ${installmentTerm} งวด` : ''}) สำเร็จ · อ้างอิง ${reference}`);
  });
  return payment;
}

/** คืนเงิน (mock) — เต็มจำนวนหรือบางส่วน · เงินกลับช่องทางเดิม */
export async function refundPayment(paymentId: string, amount: number, reason: string, by: string): Promise<{ ok: boolean; message?: string }> {
  const p = await findPayment(paymentId);
  if (!p) return { ok: false, message: 'ไม่พบรายการชำระ' };
  const refunded = p.refunds.reduce((s, r) => s + r.amount, 0);
  if (p.status !== 'succeeded' && p.status !== 'partially_refunded') return { ok: false, message: 'คืนเงินได้เฉพาะรายการที่ชำระสำเร็จ' };
  if (!Number.isInteger(amount) || amount <= 0 || amount > p.amount - refunded) return { ok: false, message: `ยอดคืนต้องอยู่ระหว่าง 0.01 ถึง ${((p.amount - refunded) / 100).toFixed(2)} บาท` };
  const total = refunded + amount;
  const status: PaymentStatus = total >= p.amount ? 'refunded' : 'partially_refunded';
  const refund = { id: `rf-${Date.now().toString(36)}`, amount, reason, at: nowIso(), by };
  await updatePayment(paymentId, (x) => ({ ...x, status, refunds: [...x.refunds, refund] }));
  await updateOrder(p.orderId, (o) => withEvent({ ...o, payment: o.payment ? { ...o.payment, status, refundedAmount: total } : o.payment }, 'payment', by, `คืนเงิน ${(amount / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ผ่าน Beam${reason ? ` — ${reason}` : ''}`));
  return { ok: true };
}
