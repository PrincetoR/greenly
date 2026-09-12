import Link from 'next/link';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { PromoCard } from '@/components/shop/promo-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'โปรโมชัน' };

export default async function PromotionsPage() {
  const [{ promotions, usage, now }, categories, products] = await Promise.all([loadPromotionContext(), listCategories({ activeOnly: true }), listProducts()]);
  const withStatus = promotions.map((p) => ({ p, status: promotionStatus(p, now, usage[p.id]) }));
  const live = withStatus.filter((x) => x.status === 'live').sort((a, b) => a.p.endsAt.localeCompare(b.p.endsAt));
  const upcoming = withStatus.filter((x) => x.status === 'scheduled').sort((a, b) => a.p.startsAt.localeCompare(b.p.startsAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">โปรโมชัน</h1>
      <p className="mt-1 text-sm text-muted">ส่วนลดมีผลอัตโนมัติเมื่อใส่สินค้าลงตะกร้า · คูปองกรอกโค้ดตอนชำระเงิน</p>

      <h2 className="mt-8 text-lg font-bold">กำลังใช้งาน ({live.length})</h2>
      {live.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon="🏷️"
            title="ตอนนี้ยังไม่มีโปรโมชัน"
            description={upcoming.length > 0 ? 'มีโปรกำลังจะมาเร็ว ๆ นี้ ดูด้านล่าง' : 'ติดตามโปรใหม่ได้ที่นี่'}
            action={
              <Link href="/products" className={buttonStyles()}>
                ดูสินค้าทั้งหมด
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {live.map(({ p }) => (
            <PromoCard key={p.id} promo={p} status="live" usage={usage[p.id]} categories={categories} products={products} now={now} />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-bold">เร็ว ๆ นี้ ({upcoming.length})</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {upcoming.map(({ p }) => (
              <PromoCard key={p.id} promo={p} status="scheduled" usage={usage[p.id]} categories={categories} products={products} now={now} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
