import Link from 'next/link';
import { redirect } from 'next/navigation';
import { loadCart } from '@/lib/cart/service';
import { getSettings } from '@/lib/db/settings';
import { formatBaht } from '@/lib/money';
import { ProductImage } from '@/components/product-image';
import { OrderSummary } from '@/components/shop/order-summary';
import { CheckoutForm } from '@/components/shop/checkout-form';

export const metadata = { title: 'ชำระเงิน' };

export default async function CheckoutPage() {
  const [cart, settings] = await Promise.all([loadCart(), getSettings()]);
  if (cart.lines.length === 0) redirect('/cart');
  const { quote } = cart;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">ชำระเงิน</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <CheckoutForm total={quote.total} gifts={quote.lines.filter((l) => l.isGift).reduce((s, l) => s + l.qty, 0)} />

        <aside className="rounded-card bg-surface p-5 ring-1 ring-line lg:sticky lg:top-20">
          <h2 className="font-semibold">รายการสินค้า</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {quote.lines.map((l) => (
              <li key={`${l.productId}-${l.isGift}`} className="flex items-center gap-3">
                <ProductImage src={l.image} alt="" className="size-12 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1">{l.name}</span>
                  <span className="text-xs text-muted">
                    {l.qty} ชิ้น{l.isGift && ' · ของแถม'}
                  </span>
                </span>
                <span className={l.discount > 0 ? 'text-accent' : ''}>{formatBaht(l.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-4">
            <OrderSummary quote={quote} freeShippingMin={settings.freeShippingMin} />
          </div>
          <Link href="/cart" className="mt-3 block text-center text-sm text-muted hover:text-ink">
            ← แก้ไขตะกร้า
          </Link>
        </aside>
      </div>
    </div>
  );
}
