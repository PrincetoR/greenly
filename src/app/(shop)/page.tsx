import Link from 'next/link';
import type { Category } from '@/lib/types';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { listOrders } from '@/lib/db/orders';
import { getHomepage } from '@/lib/db/homepage';
import { HeroSlider } from '@/components/shop/hero-slider';
import { HeroHeaderSync } from '@/components/shop/hero-header-sync';
import { HScroller } from '@/components/shop/h-scroller';
import { gridCell, pageFillers, pageSnapClass } from '@/lib/grid-cell';
import { SnapWheel } from '@/components/shop/snap-wheel';
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

/** คอลัมน์ต่อแถวของแถวเลื่อนข้าง (มือถือ / sm / lg) — 2 แถวต่อหน้า */
const CAT_COLS = { m: 3, s: 4, l: 8 };
const PROMO_COLS = { m: 1, s: 2, l: 2 };

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
      {/* ล้อเมาส์นิดเดียว = ไปกลุ่มถัดไปทันที (จอ md+) */}
      <SnapWheel />
      {/* ป๊อปอัปตอนเข้าเว็บ (ตั้งค่าที่หลังบ้าน › หน้าแรก) · ?popup=1 บังคับโชว์เพื่อดูตัวอย่าง */}
      <WelcomePopup popup={home.popup} force={sp.popup === '1'} />

      {/* แบนเนอร์: สไลด์จากหลังบ้าน · ไม่มีสไลด์ = ชื่อร้าน + สโลแกนแบบเดิม · h1 ซ่อนไว้ให้ SEO/screen reader */}
      {slides.length > 0 ? (
        // แถบขาวสุดจอ ต่อจาก header (ใช้เส้นขอบล่างของ header เป็นเส้นบน) มีเส้นขอบล่างของตัวเอง — พี่ต่อสั่ง
        <div className="bg-surface border-b border-line" data-hero-band>
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

      {/*
       * หมวดหมู่เป็นการ์ด 2 แถว เรียงซ้าย→ขวาแล้วลงแถวล่าง แล้วเลื่อนไปทางข้างทีละหน้า (พี่ต่อสั่ง): มือถือแถวละ 3 · แท็บเล็ต 4 · จอใหญ่ 8
       * มีรูปใช้รูป ไม่มีใช้ไอคอน · HScroller ใส่จุดบอกหน้า/ขอบจาง/ปุ่มให้รู้ว่าเลื่อนได้
       */}
      <Section title="หมวดหมู่" href="/products">
        {/* scroll container เป็น grid เอง (ไม่กำหนด grid-rows-2 — แถวที่ 2 เกิดเองเมื่อมีของ ไม่งั้นแถวว่างกินที่) */}
        <HScroller ariaLabel="หมวดหมู่" gridClassName="grid auto-cols-[calc((100%-24px)/3)] gap-3 sm:auto-cols-[calc((100%-36px)/4)] lg:auto-cols-[calc((100%-84px)/8)]">
          {categories.map((c, i) => (
            <div key={c.id} className={`hs-cell ${pageSnapClass(i, CAT_COLS)}`} style={gridCell(i, CAT_COLS)}>
              <CategoryCard c={c} />
            </div>
          ))}
          {/* ช่องว่างเติมหน้าสุดท้ายให้เต็ม — เลื่อนแล้วเห็นหน้าถัดไปเต็ม ๆ ไม่ค้างครึ่งหน้า (พี่ต่อสั่ง) */}
          {pageFillers(categories.length, CAT_COLS).map((f) => (
            <div key={`fill-${f.i}`} aria-hidden className={`hs-cell ${f.className}`} style={gridCell(f.i, CAT_COLS)} />
          ))}
        </HScroller>
      </Section>

      {/* โปรที่กำลังใช้งาน — โผล่/หายเองตามเวลาและ quota */}
      {live.length > 0 && (
        <Section title="โปรโมชันตอนนี้" description="ราคาโปรมีผลอัตโนมัติ ไม่ต้องทำอะไรเพิ่ม" href="/promotions">
          {/* 2 แถว เรียงซ้าย→ขวาแล้วลงแถวล่าง: จอใหญ่ 2 ใบ/แถว (4 ใบ/หน้า) · มือถือ 1 ใบ/แถว (2 ใบ/หน้า) แล้วเลื่อนข้าง — มีจุด/ขอบจาง/ปุ่มบอกว่าเลื่อนได้ (พี่ต่อสั่ง) */}
          <HScroller ariaLabel="โปรโมชันตอนนี้" gridClassName="grid auto-cols-[100%] gap-3 sm:auto-cols-[calc((100%-12px)/2)]">
            {live.map((p, i) => (
              <div key={p.id} className={`hs-cell h-full ${pageSnapClass(i, PROMO_COLS)}`} style={gridCell(i, PROMO_COLS)}>
                <PromoCard promo={p} status="live" usage={usage[p.id]} categories={categories} products={allProducts} now={now} />
              </div>
            ))}
            {pageFillers(live.length, PROMO_COLS).map((f) => (
              <div key={`fill-${f.i}`} aria-hidden className={`hs-cell ${f.className}`} style={gridCell(f.i, PROMO_COLS)} />
            ))}
          </HScroller>
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

function CategoryCard({ c }: { c: Category }) {
  return (
    <Link href={`/category/${c.slug}`} className="group card-hover flex h-full flex-col items-center gap-2 rounded-card bg-surface p-3 text-center border border-line">
      {c.image ? (
        <ProductImage src={c.image} alt="" className="size-14 rounded-full" />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
          <CategoryIcon icon={c.icon} className="size-7" />
        </span>
      )}
      <span className="line-clamp-2 text-xs leading-5 font-medium group-hover:text-brand sm:text-sm">{c.name}</span>
    </Link>
  );
}
