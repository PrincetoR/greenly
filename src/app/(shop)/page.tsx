import Link from 'next/link';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { listOrders } from '@/lib/db/orders';
import { getHomepage } from '@/lib/db/homepage';
import { HeroSlider } from '@/components/shop/hero-slider';
import { HeroHeaderSync } from '@/components/shop/hero-header-sync';
import { WelcomePopup } from '@/components/shop/welcome-popup';
import { topProducts } from '@/lib/analytics/categories';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { ProductGrid } from '@/components/shop/product-card';
import { PromoProductCard } from '@/components/shop/promo-product-card';
import { PromoCard } from '@/components/shop/promo-card';
import { Section } from '@/components/shop/section';
import { buttonStyles } from '@/components/ui/button';
import { CategoryIcon } from '@/components/category-icon';
import { ProductImage } from '@/components/product-image';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const [ctx, categories, featured, newest, allProducts, orders, home, sp] = await Promise.all([
    loadPromotionContext(),
    listCategories({ activeOnly: true }),
    listProducts({ activeOnly: true, featuredOnly: true, sort: 'newest' }),
    listProducts({ activeOnly: true, sort: 'newest' }),
    listProducts(),
    listOrders(),
    getHomepage(),
    searchParams,
  ]);
  const slides = home.slides.filter((s) => s.active && s.slot === 'main');
  const sideBanners = home.slides.filter((s) => s.active && s.slot === 'side');
  const { settings, promotions, usage, now } = ctx;
  const live = promotions.filter((p) => promotionStatus(p, now, usage[p.id]) === 'live');

  // สินค้าขายดี = จำนวนชิ้นที่ขายได้ 30 วันล่าสุด (นิยามเดียวกับแดชบอร์ด) · ถ้าน้อยกว่า 4 ตัวให้นับทั้งหมด
  const activeById = new Map(allProducts.filter((p) => p.active).map((p) => [p.id, p]));
  const pickTop = (start: Date) =>
    topProducts(orders, { start, end: now }, 12)
      .map((t) => activeById.get(t.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 8);
  let bestsellers = pickTop(new Date(now.getTime() - 30 * 86_400_000));
  let bestsellersHint = 'จัดอันดับจากยอดขายจริง 30 วันล่าสุด';
  if (bestsellers.length < 4) {
    bestsellers = pickTop(new Date(0));
    bestsellersHint = 'จัดอันดับจากยอดขายจริงทั้งหมด';
  }

  return (
    // snap-sections: จอ md+ เลื่อนแล้วหยุดทีละกลุ่ม (พี่ต่อสั่ง) — กฎอยู่ใน globals.css
    <div className="snap-sections pb-8">
      {/* ป๊อปอัปตอนเข้าเว็บ (ตั้งค่าที่หลังบ้าน › หน้าแรก) · ?popup=1 บังคับโชว์เพื่อดูตัวอย่าง */}
      <WelcomePopup popup={home.popup} force={sp.popup === '1'} />

      {/* แบนเนอร์: สไลด์จากหลังบ้าน · ไม่มีสไลด์ = ชื่อร้าน + สโลแกนแบบเดิม · h1 ซ่อนไว้ให้ SEO/screen reader */}
      {slides.length > 0 ? (
        // แถบขาวสุดจอ ต่อจาก header (ใช้เส้นขอบล่างของ header เป็นเส้นบน) มีเส้นขอบล่างของตัวเอง — พี่ต่อสั่ง
        <div className="bg-surface border-b border-line">
          <HeroHeaderSync />
          <h1 className="sr-only">{settings.storeName}</h1>
          <HeroSlider slides={slides} side={sideBanners} autoplaySeconds={home.autoplaySeconds} />
        </div>
      ) : (
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
      )}

      {/* หมวดหมู่เป็นการ์ด แถวละ 8 (จอใหญ่) · มีรูปใช้รูป ไม่มีใช้ไอคอน (พี่ต่อสั่ง) */}
      <Section title="หมวดหมู่" href="/products">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group flex h-full flex-col items-center gap-2 rounded-card bg-surface p-3 text-center border border-line transition-colors hover:border-brand hover:bg-brand-soft/40">
                {c.image ? (
                  <ProductImage src={c.image} alt="" className="size-14 rounded-full" />
                ) : (
                  <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
                    <CategoryIcon icon={c.icon} className="size-7" />
                  </span>
                )}
                <span className="line-clamp-2 text-xs leading-5 font-medium group-hover:text-brand sm:text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

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

      {featured.length > 0 && (
        <Section title="สินค้าแนะนำ" href="/products">
          <ProductGrid>
            {featured.slice(0, 8).map((p, i) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} priority={i < 4} />
            ))}
          </ProductGrid>
        </Section>
      )}

      {bestsellers.length > 0 && (
        <Section title="สินค้าขายดี" description={bestsellersHint} href="/products">
          <ProductGrid>
            {bestsellers.map((p, i) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} rank={i + 1} />
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
