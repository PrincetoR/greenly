import Link from 'next/link';
import { loadCart } from '@/lib/cart/service';
import { getSettings } from '@/lib/db/settings';
import { updateCartQty, removeFromCart } from '@/lib/actions/cart';
import { formatBaht } from '@/lib/money';
import { ProductImage } from '@/components/product-image';
import { OrderSummary } from '@/components/shop/order-summary';
import { CouponBox } from '@/components/shop/coupon-box';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { AutoSubmitSelect } from '@/components/ui/auto-submit-select';

export const metadata = { title: 'ตะกร้าสินค้า' };

export default async function CartPage() {
  const [cart, settings] = await Promise.all([loadCart(), getSettings()]);
  const { quote, lines, removed } = cart;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          icon="🛒"
          title="ตะกร้ายังว่างอยู่"
          description="เลือกสินค้าที่ชอบแล้วกลับมาที่นี่ได้เลย"
          action={
            <Link href="/products" className={buttonStyles()}>
              เลือกซื้อสินค้า
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">ตะกร้าสินค้า</h1>

      {removed.length > 0 && (
        <Alert tone="warn" className="mt-4">
          นำออกจากตะกร้าเพราะสินค้าหมดหรือปิดขาย: {removed.join(', ')}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-3">
          {quote.lines.map((l) => {
            const input = lines.find((x) => x.product.id === l.productId)!;
            return (
              <div key={`${l.productId}-${l.isGift}`} className={`flex gap-3 rounded-card p-3 ring-1 sm:gap-4 sm:p-4 ${l.isGift ? 'bg-brand-soft/40 ring-brand/30' : 'bg-surface ring-line'}`}>
                <ProductImage src={l.image} alt="" className="size-20 shrink-0 rounded-lg sm:size-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/product/${input.product.slug}`} className="line-clamp-2 font-medium hover:text-brand">
                        {l.name}
                      </Link>
                      {l.isGift ? (
                        <Badge tone="brand" className="mt-1">
                          🎁 ของแถม · {l.promotionName}
                        </Badge>
                      ) : l.promotionName ? (
                        <Badge tone="accent" className="mt-1">
                          🏷️ {l.promotionName}
                          {l.discountedQty < l.qty && ` (${l.discountedQty}/${l.qty} ชิ้น)`}
                        </Badge>
                      ) : null}
                    </div>
                    {!l.isGift && (
                      <form action={removeFromCart}>
                        <input type="hidden" name="productId" value={l.productId} />
                        <button type="submit" aria-label={`นำ ${l.name} ออก`} className="rounded-md p-1 text-muted hover:bg-danger-soft hover:text-danger">
                          ✕
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                    {l.isGift ? (
                      <span className="text-sm text-muted">{l.qty} ชิ้น · ฟรี</span>
                    ) : (
                      <form action={updateCartQty} className="flex items-center gap-1">
                        <input type="hidden" name="productId" value={l.productId} />
                        <AutoSubmitSelect name="qty" defaultValue={l.qty} aria-label="จำนวน" className="w-auto! py-1!">
                          {Array.from({ length: Math.min(input.product.stock, 20) }, (_, k) => k + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                          {l.qty > 20 && <option value={l.qty}>{l.qty}</option>}
                        </AutoSubmitSelect>
                        <noscript>
                          <button type="submit" className="text-xs text-muted underline">
                            อัปเดต
                          </button>
                        </noscript>
                        {input.product.stock <= 5 && <span className="text-xs text-warn">เหลือ {input.product.stock}</span>}
                      </form>
                    )}
                    <div className="text-right">
                      {l.discount > 0 && !l.isGift && <p className="text-xs text-muted line-through">{formatBaht(l.unitPrice * l.qty)}</p>}
                      <p className={`font-bold ${l.discount > 0 ? 'text-accent' : ''}`}>{l.isGift ? formatBaht(0) : formatBaht(l.total)}</p>
                      {!l.isGift && l.qty > 1 && <p className="text-xs text-muted">{formatBaht(l.unitPrice)} / ชิ้น</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {quote.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
              {quote.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-card bg-surface p-5 ring-1 ring-line lg:sticky lg:top-20">
          <CouponBox coupon={quote.coupon} />
          <OrderSummary quote={quote} freeShippingMin={settings.freeShippingMin} />
          <Link href="/checkout" className={buttonStyles({ size: 'lg' })}>
            ไปชำระเงิน
          </Link>
          <Link href="/products" className="text-center text-sm text-muted hover:text-ink">
            ← เลือกซื้อต่อ
          </Link>
        </aside>
      </div>
    </div>
  );
}
