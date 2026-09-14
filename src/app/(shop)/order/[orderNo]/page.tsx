import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findOrderByNo } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { readGuestId } from '@/lib/guest';
import { OrderLookupForm } from '@/components/shop/order-lookup-form';
import { formatBaht } from '@/lib/money';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { ORDER_STATUS_HINT, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_CHANNEL_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '@/lib/orders/labels';
import { carrierById } from '@/lib/shipping/carriers';
import { guessProvince, trackingTimeline } from '@/lib/shipping/tracking';
import { payOrder } from '@/lib/actions/payments';
import { StatusStepper } from '@/components/orders/status-stepper';
import { TrackingTimeline } from '@/components/orders/tracking-timeline';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, Gift, Lock, Truck } from 'lucide-react';

export const metadata = { title: 'คำสั่งซื้อ' };

export default async function OrderPage({ params, searchParams }: PageProps<'/order/[orderNo]'>) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const [order, settings, guestId] = await Promise.all([findOrderByNo(orderNo), getSettings(), readGuestId()]);
  if (!order) notFound();

  // รู้แค่เลขที่ยังไม่พอ — ต้องเป็นเครื่องที่สั่ง หรือยืนยันด้วยเบอร์โทรก่อน (กันคนเดาเลขมาดูที่อยู่ลูกค้า)
  if (!guestId || !order.guestIds.includes(guestId)) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-alt text-muted" aria-hidden>
          <Lock className="size-7" />
        </span>
        <h1 className="mt-3 text-2xl font-bold">ยืนยันตัวตนเพื่อดูคำสั่งซื้อ</h1>
        <p className="mt-1 text-sm text-muted">
          คำสั่งซื้อ <span className="font-mono font-semibold text-ink">{order.orderNo}</span> ไม่ได้สั่งจากเครื่องนี้ กรอกเบอร์โทรที่ใช้สั่งเพื่อดูรายละเอียด
          — ระบบจะจำเครื่องนี้ไว้ให้
        </p>
        <div className="mt-6 rounded-card bg-surface p-5 border border-line">
          <OrderLookupForm orderNo={order.orderNo} compact />
        </div>
        <Link href="/orders" className="mt-4 block text-sm text-muted hover:text-ink">
          ประวัติการสั่งซื้อ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {sp.new && (
        <Alert tone="ok" className="mb-6 flex items-center gap-2 text-base">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          สั่งซื้อสำเร็จ! ขอบคุณที่อุดหนุน {settings.storeName}
        </Alert>
      )}
      {sp.paid && (
        <Alert tone="ok" className="mb-6 flex items-center gap-2 text-base">
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          ชำระเงินสำเร็จ! ร้านกำลังเตรียมสินค้าให้คุณ
        </Alert>
      )}
      {sp.failed && <Alert tone="danger" className="mb-6">ชำระเงินไม่สำเร็จ — ลองใหม่อีกครั้งหรือเลือกช่องทางอื่นได้ด้านล่าง</Alert>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">เลขที่คำสั่งซื้อ</p>
          <h1 className="font-mono text-2xl font-bold">{order.orderNo}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(order.createdAt)}</p>
        </div>
        <Badge tone={ORDER_STATUS_TONE[order.status]} className="text-sm">
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>

      {/* ขั้นตอน + คำอธิบายสถานะปัจจุบัน */}
      <section className="mt-6 rounded-card bg-surface p-5 border border-line">
        <StatusStepper status={order.status} />
        <p className="mt-4 text-sm text-muted">{ORDER_STATUS_HINT[order.status]}</p>
      </section>

      {order.status === 'pending' && order.paymentMethod === 'beam' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-warn-soft p-5 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-warn">ยังไม่ได้ชำระเงิน</p>
            <p className="mt-1 text-muted">
              ยอด <b className="text-ink">{formatBaht(order.total)}</b> — ชำระออนไลน์ได้ด้วย PromptPay บัตร Mobile Banking หรือ E-Wallet · ร้านจะแพ็คสินค้าหลังได้รับเงิน
            </p>
          </div>
          <form action={payOrder}>
            <input type="hidden" name="orderNo" value={order.orderNo} />
            <Button type="submit">ชำระเงินตอนนี้</Button>
          </form>
        </div>
      )}
      {order.status === 'pending' && order.paymentMethod === 'cod' && (
        <div className="mt-4 rounded-card bg-info-soft p-5 text-sm">
          <p className="font-semibold text-info">เก็บเงินปลายทาง</p>
          <p className="mt-1 text-muted">
            เตรียมเงินสด <b className="text-ink">{formatBaht(order.total)}</b> ให้พนักงานจัดส่ง · ร้านจะยืนยันคำสั่งซื้อและเริ่มแพ็คเร็ว ๆ นี้
          </p>
        </div>
      )}

      {/* ติดตามพัสดุ */}
      {order.shipment && (
        <section className="mt-4 rounded-card bg-surface p-5 border border-line">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Truck className="size-4 text-brand" aria-hidden />
                ติดตามพัสดุ
              </h2>
              <p className="mt-1 text-sm">
                {carrierById(order.shipment.carrier).name} · เลขพัสดุ <span className="font-mono font-semibold">{order.shipment.trackingNo}</span>
              </p>
              <p className="text-xs text-muted">
                ส่งเมื่อ {formatDateTime(order.shipment.shippedAt)}
                {order.status === 'shipped' && ` · คาดว่าถึงภายใน ${carrierById(order.shipment.carrier).etaDays[1]} วัน`}
                {order.shipment.deliveredAt && ` · ถึงเมื่อ ${formatDateTime(order.shipment.deliveredAt)}`}
              </p>
            </div>
            <a href={carrierById(order.shipment.carrier).trackUrl(order.shipment.trackingNo)} target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              เช็คที่เว็บขนส่ง
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
          <div className="mt-4">
            <TrackingTimeline events={trackingTimeline(order.shipment, order.status, new Date(), guessProvince(order.customer.address))} />
          </div>
          <p className="mt-3 text-xs text-muted">ข้อมูลพัสดุเป็นการจำลอง — ของจริงจะดึงจากระบบขนส่งโดยตรง</p>
        </section>
      )}

      <section className="mt-6 rounded-card bg-surface p-5 border border-line">
        <h2 className="font-semibold">รายการสินค้า</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.lines.map((l, i) => (
            <li key={i} className="flex items-center gap-3 py-3 text-sm">
              <ProductImage src={l.image} alt="" className="size-14 rounded-md" />
              <span className="min-w-0 flex-1">
                <span className="block">{l.name}</span>
                <span className="text-xs text-muted">
                  {l.qty} × {formatBaht(l.unitPrice)}
                  {l.isGift && (
                    <>
                      {' · '}
                      <Gift className="inline size-3 align-[-2px]" aria-hidden /> ของแถม
                    </>
                  )}
                </span>
              </span>
              <span className="text-right">
                {l.discount > 0 && !l.isGift && <span className="block text-xs text-muted line-through">{formatBaht(l.unitPrice * l.qty)}</span>}
                <span className={l.discount > 0 ? 'font-medium text-accent' : ''}>{formatBaht(l.unitPrice * l.qty - l.discount)}</span>
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">ยอดสินค้า</dt><dd>{formatBaht(order.subtotal)}</dd></div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between"><dt className="text-muted">ส่วนลด{order.couponCode && ` (คูปอง ${order.couponCode})`}</dt><dd className="text-accent">-{formatBaht(order.discountTotal)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted">ค่าจัดส่ง</dt><dd>{order.shippingFee === 0 ? 'ฟรี' : formatBaht(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>ยอดชำระ</dt><dd>{formatBaht(order.total)}</dd></div>
        </dl>
      </section>

      <section className="mt-4 grid gap-4 rounded-card bg-surface p-5 text-sm border border-line sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">จัดส่งถึง</h2>
          <p className="mt-1">{order.customer.name}</p>
          <p className="text-muted">{order.customer.phone}</p>
          <p className="text-muted whitespace-pre-line">{order.customer.address}</p>
        </div>
        <div>
          <h2 className="font-semibold">การชำระเงิน</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            {PAYMENT_LABEL[order.paymentMethod]}
            {order.payment && <Badge tone={PAYMENT_STATUS_TONE[order.payment.status]}>{PAYMENT_STATUS_LABEL[order.payment.status]}</Badge>}
          </p>
          {order.payment?.channel && order.payment.channel !== 'cod' && (
            <p className="text-muted">
              {PAYMENT_CHANNEL_LABEL[order.payment.channel]}
              {order.payment.paidAt && ` · ${formatDate(order.payment.paidAt)}`}
            </p>
          )}
          {order.payment && order.payment.refundedAmount > 0 && <p className="text-info">คืนเงินแล้ว {formatBaht(order.payment.refundedAmount)} — เงินจะกลับเข้าช่องทางเดิมภายใน 5–10 วันทำการ</p>}
          {order.note && <p className="mt-2 text-muted">หมายเหตุ: {order.note}</p>}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/products" className={buttonStyles()}>
          เลือกซื้อสินค้าต่อ
        </Link>
        <Link href="/orders" className={buttonStyles({ variant: 'secondary' })}>
          ประวัติการสั่งซื้อ
        </Link>
      </div>
    </div>
  );
}
