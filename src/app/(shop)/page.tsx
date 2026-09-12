import Link from 'next/link';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { getSettings } from '@/lib/db/settings';
import { ProductCard, ProductGrid } from '@/components/shop/product-card';
import { Section } from '@/components/shop/section';
import { buttonStyles } from '@/components/ui/button';

export default async function HomePage() {
  const [settings, categories, featured, newest] = await Promise.all([
    getSettings(),
    listCategories({ activeOnly: true }),
    listProducts({ activeOnly: true, featuredOnly: true, sort: 'newest' }),
    listProducts({ activeOnly: true, sort: 'newest' }),
  ]);

  return (
    <div className="pb-8">
      {/* hero */}
      <section className="bg-gradient-to-br from-brand-soft via-page to-accent-soft">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-14 sm:py-20">
          <h1 className="text-3xl font-bold sm:text-5xl">{settings.storeName}</h1>
          <p className="max-w-lg text-lg text-muted">{settings.tagline}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/products" className={buttonStyles({ size: 'lg' })}>
              เลือกซื้อสินค้า
            </Link>
            <Link href="/promotions" className={buttonStyles({ size: 'lg', variant: 'secondary' })}>
              ดูโปรโมชัน
            </Link>
          </div>
        </div>
      </section>

      {/* หมวดหมู่ — เลื่อนแนวนอนบนมือถือ */}
      <Section title="หมวดหมู่">
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link
                href={`/category/${c.slug}`}
                className="block rounded-full bg-surface px-4 py-2 text-sm font-medium ring-1 ring-line transition-colors hover:bg-brand-soft hover:text-brand hover:ring-brand"
              >
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
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </ProductGrid>
        </Section>
      )}

      <Section title="สินค้าใหม่" href="/products?sort=newest">
        <ProductGrid>
          {newest.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ProductGrid>
      </Section>
    </div>
  );
}
