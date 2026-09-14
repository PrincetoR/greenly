'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { findOrderByNo } from '@/lib/db/orders';
import { findPayment } from '@/lib/db/payments';
import { readGuestId } from '@/lib/guest';
import { requirePermission } from '@/lib/auth/session';
import { isBeamChannelId } from '@/lib/payments/beam';
import { isExpired, refundPayment, settleMockPayment, startBeamPayment } from '@/lib/payments/service';

/** ลูกค้ากด "ชำระเงิน" จากหน้าออเดอร์ที่ยังรอชำระ — ใช้รายการเดิมถ้ายังไม่หมดอายุ ไม่งั้นสร้างใหม่ */
export async function payOrder(formData: FormData): Promise<void> {
  const orderNo = String(formData.get('orderNo') ?? '');
  const [order, guestId] = await Promise.all([findOrderByNo(orderNo), readGuestId()]);
  if (!order || !guestId || !order.guestIds.includes(guestId)) redirect('/orders');
  if (order.status !== 'pending' || order.paymentMethod !== 'beam') redirect(`/order/${order.orderNo}`);
  const current = order.payment?.paymentId ? await findPayment(order.payment.paymentId) : undefined;
  if (current && current.status === 'pending' && !isExpired(current)) redirect(`/pay/${current.id}`);
  const payment = await startBeamPayment(order);
  redirect(`/pay/${payment.id}`);
}

/** ผลจากหน้า Beam (mock) — ของจริงคือ webhook จาก Beam ไม่ใช่ปุ่มที่ลูกค้ากด */
export async function settleMockPaymentAction(formData: FormData): Promise<void> {
  const paymentId = String(formData.get('paymentId') ?? '');
  const channel = String(formData.get('channel') ?? '');
  const outcome = String(formData.get('outcome') ?? '') === 'failed' ? 'failed' : 'succeeded';
  const termRaw = Number.parseInt(String(formData.get('term') ?? ''), 10);
  const payment = await findPayment(paymentId);
  if (!payment) redirect('/');
  if (!isBeamChannelId(channel)) redirect(`/pay/${paymentId}?error=channel`);
  const result = await settleMockPayment(paymentId, channel, outcome, Number.isInteger(termRaw) ? termRaw : null);
  revalidatePath('/', 'layout');
  if (result?.status === 'succeeded') redirect(`/order/${payment.orderNo}?paid=1`);
  if (result?.status === 'expired') redirect(`/pay/${paymentId}?expired=1`);
  redirect(`/order/${payment.orderNo}?failed=1`);
}

/** หลังบ้านคืนเงินผ่าน Beam (mock) */
export async function refundPaymentAction(formData: FormData): Promise<void> {
  const session = await requirePermission('payment.manage');
  const paymentId = String(formData.get('paymentId') ?? '');
  const amountBaht = Number(String(formData.get('amount') ?? '').replace(/,/g, ''));
  const reason = String(formData.get('reason') ?? '').trim();
  const back = String(formData.get('back') ?? '/admin/payments');
  const r = await refundPayment(paymentId, Math.round(amountBaht * 100), reason, session.user.username);
  revalidatePath('/', 'layout');
  redirect(`${back}${back.includes('?') ? '&' : '?'}${r.ok ? 'refunded=1' : `error=${encodeURIComponent(r.message ?? 'refund')}`}`);
}
