import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { findPayment } from '@/lib/db/payments';
import { isBeamChannelId } from '@/lib/payments/beam';
import { settleMockPayment } from '@/lib/payments/service';

/**
 * Webhook รับผลชำระจาก Beam (mock) — ของจริงต้องตรวจลายเซ็น (HMAC จาก secret key) ก่อนเชื่อ payload
 * ตัวอย่าง body: { "event": "payment.succeeded", "paymentId": "pay-xxxx", "channel": "promptpay", "reference": "bm_…" }
 * ทดสอบ: curl -X POST localhost:3000/api/payments/beam/webhook -H 'content-type: application/json' -d '{"event":"payment.succeeded","paymentId":"pay-xxxx","channel":"promptpay"}'
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { event?: string; paymentId?: string; channel?: string; installmentTerm?: number } | null;
  if (!body?.event || !body.paymentId) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  // TODO(ต่อจริง): verify `x-beam-signature` = HMAC-SHA256(secret, rawBody) และกันยิงซ้ำด้วย event id
  const payment = await findPayment(body.paymentId);
  if (!payment) return NextResponse.json({ ok: false, error: 'payment_not_found' }, { status: 404 });
  if (body.event !== 'payment.succeeded' && body.event !== 'payment.failed') return NextResponse.json({ ok: true, ignored: body.event });
  const channel = isBeamChannelId(body.channel) ? body.channel : 'promptpay';
  const result = await settleMockPayment(payment.id, channel, body.event === 'payment.succeeded' ? 'succeeded' : 'failed', body.installmentTerm ?? null);
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true, status: result?.status ?? payment.status });
}
