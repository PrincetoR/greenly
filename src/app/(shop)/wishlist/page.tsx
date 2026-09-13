import Link from 'next/link';
import { Heart } from 'lucide-react';
import { findProductsByIds } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { ProductGrid } from '@/components/shop/product-card';
import { PromoProductCard } from '@/components/shop/promo-product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'รายการโปรด' };

/** สินค้าที่กดหัวใจไว้ — ผูกกับเบราว์เซอร์นี้ (guest id) ไม่ต้อง login */
export default async function WishlistPage() {
  const ctx = await loadPromotionContext();
  const products = await findProductsByIds(ctx.wishlist);
  // เรียงตามลำดับที่กด (ล่าสุดอยู่ท้าย → แสดงล่าสุดก่อน)
  const ordered = ctx.wishlist.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p)).reverse();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">รายการโปรด</h1>
          <p className="mt-1 text-sm text-muted">ระบบจำเครื่องนี้ไว้ให้ ไม่ต้องสมัครสมาชิก</p>
        </div>
        <p className="text-sm text-muted">{ordered.length} รายการ</p>
      </div>

      <div className="mt-6">
        {ordered.length === 0 ? (
          <EmptyState
            icon={<Heart />}
            title="ยังไม่มีสินค้าในรายการโปรด"
            description="กดรูปหัวใจบนสินค้าที่ถูกใจ แล้วกลับมาดูที่นี่ได้ทุกเมื่อ"
            action={
              <Link href="/products" className={buttonStyles()}>
                เลือกซื้อสินค้า
              </Link>
            }
          />
        ) : (
          <ProductGrid>
            {ordered.map((p, i) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} priority={i < 4} />
            ))}
          </ProductGrid>
        )}
      </div>
    </div>
  );
}
