import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { findOrder } from '@/lib/db/orders';
import { listPromotions } from '@/lib/db/promotions';
import { changeOrderStatus } from '@/lib/actions/orders';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { NEXT_STATUS, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_LABEL } from '@/lib/orders/labels';
import { PageHeader } from '@/components/admin/page-header';
import { ProductImage } from '@/components/product-image';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';

export const metadata = { title: 'รายละเอียดคำสั่งซื้อ' };

export default async function OrderDetailPage({ params, searchParams }: PageProps<'/admin/orders/[id]'>) {
  await requirePermission('order.manage');
  const { id } = await params;
  const sp = await searchParams;
  const [order, promotions] = await Promise.all([findOrder(id), listPromotions()]);
  if (!order) notFound();
  const promoName = new Map(promotions.map((p) => [p.id, p.name]));
  const next = NEXT_STATUS[order.status];

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        description={`${formatDateTime(order.createdAt)} · อัปเดต ${formatDateTime(order.updatedAt)}`}
        action={
          <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">
            ← รายการทั้งหมด
          </Link>
        }
      />
      {sp.updated && <Alert tone="ok" className="mb-4">อัปเดตสถานะแล้ว</Alert>}
      {sp.error === 'transition' && <Alert tone="danger" className="mb-4">เปลี่ยนสถานะนี้ไม่ได้จากสถานะปัจจุบัน</Alert>}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="รายการสินค้า" />
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
                      {l.isGift && ' · 🎁 ของแถม'}
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

          {order.promotionUsages.length > 0 && (
            <Card>
              <CardHeader title="โปรโมชันที่ใช้" description="ออเดอร์นี้นับเป็นสิทธิ์ของโปรเหล่านี้ · ยกเลิกออเดอร์แล้วสิทธิ์จะคืน" />
              <ul className="flex flex-wrap gap-2 p-5">
                {order.promotionUsages.map((u, i) => (
                  <li key={i}>
                    <Badge tone="brand">
                      {promoName.get(u.promotionId) ?? u.promotionId}
                      {u.productId && ` · ${u.qty} ชิ้น`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="สถานะ" />
            <div className="flex flex-col gap-3 p-5">
              <Badge tone={ORDER_STATUS_TONE[order.status]} className="self-start text-sm">
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
              {next.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => (
                    <form key={s} action={changeOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value={s} />
                      {s === 'cancelled' ? (
                        <ConfirmButton variant="danger" message="ยกเลิกคำสั่งซื้อนี้? stock และสิทธิ์โปรโมชันจะถูกคืน">
                          ยกเลิกคำสั่งซื้อ
                        </ConfirmButton>
                      ) : (
                        <Button type="submit">→ {ORDER_STATUS_LABEL[s]}</Button>
                      )}
                    </form>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">สถานะสุดท้ายแล้ว</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="ลูกค้า" />
            <div className="p-5 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p>
                <a href={`tel:${order.customer.phone}`} className="text-brand hover:underline">
                  {order.customer.phone}
                </a>
              </p>
              {order.customer.email && <p className="text-muted">{order.customer.email}</p>}
              <p className="mt-2 whitespace-pre-line text-muted">{order.customer.address}</p>
              <p className="mt-3 border-t border-line pt-3">ชำระ: {PAYMENT_LABEL[order.paymentMethod]}</p>
              {order.note && <p className="mt-1 text-muted">หมายเหตุ: {order.note}</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
