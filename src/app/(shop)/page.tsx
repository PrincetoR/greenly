import Link from 'next/link';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { ProductGrid } from '@/components/shop/product-card';
import { PromoProductCard } from '@/components/shop/promo-product-card';
import { PromoCard } from '@/components/shop/promo-card';
import { Section } from '@/components/shop/section';
import { buttonStyles } from '@/components/ui/button';

export default async function HomePage() {
  const [ctx, categories, featured, newest, allProducts] = await Promise.all([
    loadPromotionContext(),
    listCategories({ activeOnly: true }),
    listProducts({ activeOnly: true, featuredOnly: true, sort: 'newest' }),
    listProducts({ activeOnly: true, sort: 'newest' }),
    listProducts(),
  ]);
  const { settings, promotions, usage, now } = ctx;
  const live = promotions.filter((p) => promotionStatus(p, now, usage[p.id]) === 'live');

  return (
    <div className="pb-8">
      <section className="bg-gradient-to-br from-brand-soft via-page to-accent-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-14 sm:py-20">
          <h1 className="text-3xl font-bold sm:text-5xl">{settings.storeName}</h1>
          <p className="max-w-lg text-lg text-muted">{settings.tagline}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/products" className={buttonStyles({ size: 'lg' })}>
              เลือกซื้อสินค้า
            </Link>
            <Link href="/promotions" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
              ดูโปรโมชัน{live.length > 0 && ` (${live.length})`}
            </Link>
          </div>
        </div>
      </section>

      {/* โปรที่กำลังใช้งาน — โผล่/หายเองตามเวลาและ quota */}
      {live.length > 0 && (
        <Section title="โปรโมชันตอนนี้" description="ราคาโปรมีผลอัตโนมัติ ไม่ต้องทำอะไรเพิ่ม" href="/promotions">
          <div className="grid gap-3 md:grid-cols-2">
            {live.slice(0, 4).map((p) => (
              <PromoCard key={p.id} promo={p} status="live" usage={usage[p.id]} categories={categories} products={allProducts} now={now} />
            ))}
          </div>
        </Section>
      )}

      <Section title="หมวดหมู่">
        <ul className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:-mx-1 sm:flex-wrap sm:px-1">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link href={`/category/${c.slug}`} className="block rounded-full bg-surface px-4 py-2 text-sm font-medium border border-line transition-colors hover:bg-brand-soft hover:text-brand hover:ring-brand">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {featured.length > 0 && (
        <Section title="สินค้าแนะนำ" href="/products">
          <ProductGrid>
            {featured.slice(0, 8).map((p, i) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} priority={i < 4} />
            ))}
          </ProductGrid>
        </Section>
      )}

      <Section title="สินค้าใหม่" href="/products?sort=newest">
        <ProductGrid>
          {newest.slice(0, 8).map((p) => (
            <PromoProductCard key={p.id} product={p} ctx={ctx} />
          ))}
        </ProductGrid>
      </Section>
    </div>
  );
}
