import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findPayment } from '@/lib/db/payments';
import { findOrder } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { availableChannels } from '@/lib/payments/beam';
import { isExpired } from '@/lib/payments/service';
import { formatBaht } from '@/lib/money';
import { PAYMENT_STATUS_LABEL } from '@/lib/orders/labels';
import { buttonStyles } from '@/components/ui/button';
import { BeamCheckout } from '@/components/pay/beam-checkout';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export const metadata = { title: 'ชำระเงิน · Beam (จำลอง)' };

/** หน้าชำระเงินที่ Beam โฮสต์ (จำลอง) — ลูกค้าเลือกช่องทาง แล้ว "จำลอง" ผลสำเร็จ/ไม่สำเร็จ */
export default async function PayPage({ params, searchParams }: PageProps<'/pay/[paymentId]'>) {
  const { paymentId } = await params;
  const sp = await searchParams;
  const [payment, settings] = await Promise.all([findPayment(paymentId), getSettings()]);
  if (!payment) notFound();
  const order = await findOrder(payment.orderId);
  if (!order) notFound();
  const expired = isExpired(payment) || Boolean(sp.expired);

  if (payment.status !== 'pending' || expired) {
    const succeeded = payment.status === 'succeeded';
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className={`mx-auto flex size-16 items-center justify-center rounded-full ${succeeded ? 'bg-ok-soft text-ok' : expired ? 'bg-surface-alt text-muted' : 'bg-danger-soft text-danger'}`} aria-hidden>
          {succeeded ? <CheckCircle2 className="size-8" /> : expired ? <Clock className="size-8" /> : <XCircle className="size-8" />}
        </span>
        <h1 className="mt-4 text-2xl font-bold">{succeeded ? 'ชำระเงินสำเร็จ' : expired ? 'รายการชำระหมดอายุ' : PAYMENT_STATUS_LABEL[payment.status]}</h1>
        <p className="mt-2 text-sm text-muted">
          คำสั่งซื้อ <span className="font-mono font-semibold text-ink">{payment.orderNo}</span> · {formatBaht(payment.amount)}
          {expired && ' — กลับไปที่คำสั่งซื้อเพื่อสร้างรายการชำระใหม่'}
        </p>
        <Link href={`/order/${payment.orderNo}${succeeded ? '?paid=1' : ''}`} className={`${buttonStyles()} mt-6`}>
          กลับไปที่คำสั่งซื้อ
        </Link>
      </div>
    );
  }

  return (
    <BeamCheckout
      payment={{ id: payment.id, orderNo: payment.orderNo, amount: payment.amount, expiresAt: payment.expiresAt }}
      merchant={settings.storeName}
      channels={availableChannels(settings.payments, payment.amount)}
      items={order.lines.filter((l) => !l.isGift).map((l) => ({ name: l.name, qty: l.qty }))}
      error={typeof sp.error === 'string' ? sp.error : null}
    />
  );
}
