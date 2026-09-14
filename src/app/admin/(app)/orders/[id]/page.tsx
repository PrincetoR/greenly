import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { roleCan } from '@/lib/auth/roles';
import { findOrder } from '@/lib/db/orders';
import { listPaymentsByOrder } from '@/lib/db/payments';
import { listPromotions } from '@/lib/db/promotions';
import { getSettings } from '@/lib/db/settings';
import { addOrderNote } from '@/lib/actions/orders';
import { refundPaymentAction } from '@/lib/actions/payments';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_CHANNEL_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '@/lib/orders/labels';
import { carrierById } from '@/lib/shipping/carriers';
import { guessProvince, trackingTimeline } from '@/lib/shipping/tracking';
import { PageHeader } from '@/components/admin/page-header';
import { OrderActions } from '@/components/admin/order-actions';
import { CopyButton } from '@/components/admin/copy-button';
import { StatusStepper } from '@/components/orders/status-stepper';
import { TrackingTimeline } from '@/components/orders/tracking-timeline';
import { OrderHistory } from '@/components/orders/order-history';
import { ProductImage } from '@/components/product-image';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { ExternalLink, Gift, Printer } from 'lucide-react';

export const metadata = { title: 'รายละเอียดคำสั่งซื้อ' };

export default async function OrderDetailPage({ params, searchParams }: PageProps<'/admin/orders/[id]'>) {
  const session = await requirePermission('order.manage');
  const { id } = await params;
  const sp = await searchParams;
  const [order, promotions, settings, payments] = await Promise.all([findOrder(id), listPromotions(), getSettings(), listPaymentsByOrder(id)]);
  if (!order) notFound();
  const promoName = new Map(promotions.map((p) => [p.id, p.name]));
  const canRefund = roleCan(session.role, 'payment.manage');
  const back = `/admin/orders/${order.id}`;
  const addressText = `${order.customer.name}\n${order.customer.phone}\n${order.customer.address}`;
  const refundable = order.payment?.provider === 'beam' && order.payment.paymentId && (order.payment.status === 'succeeded' || order.payment.status === 'partially_refunded') ? order.payment.amount - order.payment.refundedAmount : 0;

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        description={`${formatDateTime(order.createdAt)} · อัปเดต ${formatDateTime(order.updatedAt)}`}
        action={
          <>
            <a href={`/admin/shipping/labels?ids=${order.id}`} target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary' })}>
              <Printer className="size-4" aria-hidden />
              พิมพ์ใบปะหน้า
            </a>
            <Link href="/admin/orders" className={buttonStyles({ variant: 'ghost' })}>
              รายการทั้งหมด
            </Link>
          </>
        }
      />
      {sp.updated && <Alert tone="ok" className="mb-4">อัปเดตแล้ว</Alert>}
      {sp.refunded && <Alert tone="ok" className="mb-4">คืนเงินผ่าน Beam แล้ว (จำลอง)</Alert>}
      {sp.error === 'transition' && <Alert tone="danger" className="mb-4">เปลี่ยนสถานะนี้ไม่ได้จากสถานะปัจจุบัน</Alert>}
      {sp.error === 'tracking' && <Alert tone="danger" className="mb-4">กรุณาเลือกขนส่งและกรอกเลขพัสดุ (ตัวอักษร/ตัวเลข 6–30 ตัว)</Alert>}
      {sp.error === 'reason' && <Alert tone="danger" className="mb-4">กรุณาระบุเหตุผลที่ตีกลับ</Alert>}
      {typeof sp.error === 'string' && !['transition', 'tracking', 'reason'].includes(sp.error) && <Alert tone="danger" className="mb-4">{sp.error}</Alert>}

      {/* ขั้นตอน + ปุ่มดำเนินการ */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <Badge tone={ORDER_STATUS_TONE[order.status]} className="text-sm">
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
          <div className="min-w-0 flex-1 basis-80">
            <StatusStepper status={order.status} compact />
          </div>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">ดำเนินการ</p>
          <OrderActions order={order} shipping={settings.shipping} back={back} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="รายการสินค้า" description={`${order.lines.reduce((s, l) => s + l.qty, 0)} ชิ้น · ${order.lines.length} รายการ`} />
            <ul className="divide-y divide-line px-5">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 py-3 text-sm">
                  <ProductImage src={l.image} alt="" className="size-12 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <Link href={`/admin/products/${l.productId}`} className="block hover:text-brand">
                      {l.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {l.qty} × {formatBaht(l.unitPrice)}
                      {l.isGift && (
                        <>
                          {' · '}
                          <Gift className="inline size-3 align-[-2px]" aria-hidden /> ของแถม
                        </>
                      )}
                      {l.promotionId && ` · ${promoName.get(l.promotionId) ?? l.promotionId}`}
                    </span>
                  </span>
                  <span className="text-right">
                    {l.discount > 0 && <span className="block text-xs text-muted line-through">{formatBaht(l.unitPrice * l.qty)}</span>}
                    <span className={l.discount > 0 ? 'text-accent' : ''}>{formatBaht(l.unitPrice * l.qty - l.discount)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">ยอดสินค้า</dt><dd>{formatBaht(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">ส่วนลด{order.couponCode && ` (คูปอง ${order.couponCode})`}</dt><dd className="text-accent">-{formatBaht(order.discountTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">ค่าจัดส่ง</dt><dd>{order.shippingFee === 0 ? 'ฟรี' : formatBaht(order.shippingFee)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>ยอดชำระ</dt><dd>{formatBaht(order.total)}</dd></div>
            </dl>
          </Card>

          {/* การจัดส่ง */}
          <Card>
            <CardHeader
              title="การจัดส่ง"
              description={order.shipment ? `${carrierById(order.shipment.carrier).name} · ส่งเมื่อ ${formatDateTime(order.shipment.shippedAt)}` : 'ยังไม่ได้จัดส่ง — ใส่ขนส่งและเลขพัสดุตอนกด "จัดส่ง"'}
              action={
                order.shipment ? (
                  <a href={carrierById(order.shipment.carrier).trackUrl(order.shipment.trackingNo)} target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    เว็บขนส่ง
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : undefined
              }
            />
            {order.shipment ? (
              <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
                <dl className="flex flex-col gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">เลขพัสดุ</dt>
                    <dd className="flex items-center gap-1 font-mono font-semibold">
                      {order.shipment.trackingNo}
                      <CopyButton text={order.shipment.trackingNo} label="" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">น้ำหนัก / กล่อง</dt>
                    <dd>
                      {order.shipment.weightGrams ? `${order.shipment.weightGrams.toLocaleString('th-TH')} กรัม` : '—'} / {order.shipment.boxSize ?? '—'}
                    </dd>
                  </div>
                  {order.shipment.deliveredAt && (
                    <div>
                      <dt className="text-xs text-muted">ถึงมือลูกค้า</dt>
                      <dd>{formatDateTime(order.shipment.deliveredAt)}</dd>
                    </div>
                  )}
                  {order.shipment.returnedAt && (
                    <div>
                      <dt className="text-xs text-muted">ตีกลับ</dt>
                      <dd className="text-danger">
                        {formatDateTime(order.shipment.returnedAt)} — {order.shipment.returnReason}
                      </dd>
                    </div>
                  )}
                </dl>
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">ไทม์ไลน์พัสดุ (จำลอง)</p>
                  <TrackingTimeline events={trackingTimeline(order.shipment, order.status, new Date(), guessProvince(order.customer.address))} />
                </div>
              </div>
            ) : (
              <p className="p-5 text-sm text-muted">ขนส่งที่ใช้: {settings.shipping.carriers.map((c) => carrierById(c).short).join(' · ')} — เปลี่ยนได้ที่ จัดส่ง › ตั้งค่า</p>
            )}
          </Card>

          {/* ประวัติ + โน้ต */}
          <Card>
            <CardHeader title="ประวัติ" description="ทุกการเปลี่ยนแปลงของออเดอร์นี้ ใครทำ เมื่อไหร่" />
            <div className="p-5">
              <OrderHistory events={order.history} />
              <form action={addOrderNote} className="mt-4 flex gap-2 border-t border-line pt-4">
                <input type="hidden" name="id" value={order.id} />
                <input name="note" required placeholder="เพิ่มโน้ตภายใน เช่น ลูกค้าโทรมาขอเปลี่ยนที่อยู่" aria-label="โน้ตภายใน" className="h-9! min-w-0 flex-1" />
                <Button type="submit" variant="secondary" size="sm">
                  บันทึกโน้ต
                </Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {/* ลูกค้า + ที่อยู่ (คัดลอกได้) */}
          <Card>
            <CardHeader title="ลูกค้า / ที่อยู่จัดส่ง" action={<CopyButton text={addressText} label="คัดลอกที่อยู่" />} />
            <div className="p-5 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p>
                <a href={`tel:${order.customer.phone}`} className="text-brand hover:underline">
                  {order.customer.phone}
                </a>
              </p>
              {order.customer.email && <p className="text-muted">{order.customer.email}</p>}
              <p className="mt-2 whitespace-pre-line">{order.customer.address}</p>
              {order.note && <p className="mt-3 border-t border-line pt-3 text-muted">หมายเหตุลูกค้า: {order.note}</p>}
            </div>
          </Card>

          {/* การชำระเงิน */}
          <Card>
            <CardHeader
              title="การชำระเงิน"
              description={PAYMENT_LABEL[order.paymentMethod]}
              action={order.payment ? <Badge tone={PAYMENT_STATUS_TONE[order.payment.status]}>{PAYMENT_STATUS_LABEL[order.payment.status]}</Badge> : undefined}
            />
            <div className="p-5 text-sm">
              {order.payment ? (
                <dl className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-2"><dt className="text-muted">ช่องทาง</dt><dd>{order.payment.channel ? PAYMENT_CHANNEL_LABEL[order.payment.channel] : 'ยังไม่เลือก'}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted">ยอด</dt><dd className="font-medium">{formatBaht(order.payment.amount)}</dd></div>
                  {order.payment.provider === 'beam' && (
                    <>
                      <div className="flex justify-between gap-2"><dt className="text-muted">ค่าธรรมเนียม Beam</dt><dd className="text-accent">{order.payment.fee ? `-${formatBaht(order.payment.fee)}` : '—'}</dd></div>
                      <div className="flex justify-between gap-2"><dt className="text-muted">ยอดสุทธิเข้าร้าน</dt><dd className="font-medium">{order.payment.status === 'succeeded' || order.payment.refundedAmount > 0 ? formatBaht(order.payment.amount - order.payment.fee) : '—'}</dd></div>
                    </>
                  )}
                  {order.payment.paidAt && <div className="flex justify-between gap-2"><dt className="text-muted">ชำระเมื่อ</dt><dd>{formatDateTime(order.payment.paidAt)}</dd></div>}
                  {order.payment.refundedAmount > 0 && <div className="flex justify-between gap-2"><dt className="text-muted">คืนเงินแล้ว</dt><dd className="text-info">{formatBaht(order.payment.refundedAmount)}</dd></div>}
                </dl>
              ) : (
                <p className="text-muted">ยังไม่มีรายการชำระ</p>
              )}

              {payments.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-xs">
                  {payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-muted">{p.reference ?? p.id}</span>
                      <span className="shrink-0">
                        {p.channel ? PAYMENT_CHANNEL_LABEL[p.channel] : '—'} · <Badge tone={PAYMENT_STATUS_TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {canRefund && refundable > 0 && order.payment?.paymentId && (
                <form action={refundPaymentAction} className="mt-4 grid gap-2 rounded-lg bg-surface-alt p-3">
                  <input type="hidden" name="paymentId" value={order.payment.paymentId} />
                  <input type="hidden" name="back" value={back} />
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">คืนเงินผ่าน Beam</p>
                  <label className="text-xs font-medium">
                    ยอดคืน (บาท) · คืนได้อีก {formatBaht(refundable)}
                    <input name="amount" type="number" step="0.01" min={0.01} max={refundable / 100} defaultValue={(refundable / 100).toFixed(2)} className="mt-1 h-9!" aria-label="ยอดคืน" />
                  </label>
                  <input name="reason" placeholder="เหตุผล เช่น สินค้าชำรุด" className="h-9!" aria-label="เหตุผลคืนเงิน" />
                  <Button type="submit" variant="secondary" size="sm">
                    คืนเงิน
                  </Button>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
