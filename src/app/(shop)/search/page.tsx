import { SearchX } from 'lucide-react';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { describePromotion } from '@/lib/promotions/describe';
import { SearchBox } from '@/components/shop/search-box';
import { PromoCard } from '@/components/shop/promo-card';
import { ProductGrid } from '@/components/shop/product-card';
import { PromoProductCard } from '@/components/shop/promo-product-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'ค้นหา' };

/**
 * ค้นหาทั้งเว็บ (พี่ต่อสั่ง 2026-09-15): หน้ามีแค่ header + ช่องค้นหา · พิมพ์แล้วแสดง "โปรโมชัน" ก่อน แล้วค่อย "สินค้า" แยกหัวเรื่อง
 * โปรที่ค้นเจอ = กำลังใช้งาน/เร็ว ๆ นี้ ที่ชื่อ/ประโยคสรุป/โค้ดคูปองมีคำค้น · สินค้า = ชื่อ/SKU/คำอธิบาย (listProducts q)
 */
export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const [ctx, categories, allProducts, products] = await Promise.all([
    loadPromotionContext(),
    listCategories({ activeOnly: true }),
    listProducts(),
    q ? listProducts({ activeOnly: true, q, sort: 'newest' }) : [],
  ]);
  const { promotions, usage, now } = ctx;
  const names = { categories: new Map(categories.map((c) => [c.id, c.name])), products: new Map(allProducts.map((p) => [p.id, p.name])) };
  const needle = q.toLowerCase();
  const promos = q
    ? promotions
        .map((p) => ({ p, status: promotionStatus(p, now, usage[p.id]) }))
        .filter(({ p, status }) => (status === 'live' || status === 'scheduled') && `${p.name} ${describePromotion(p, names)} ${p.coupon?.code ?? ''}`.toLowerCase().includes(needle))
    : [];
  const none = q && promos.length === 0 && products.length === 0;

  return (
    // data-search-page: globals.css ซ่อน footer เว็บ — หน้ามีแค่ header กับช่องค้นหา (+ แถบเมนูล่างมือถือ — พี่ต่อขอให้คงไว้)
    <div data-search-page className="mx-auto max-w-6xl px-4 py-4 pb-10">
      <SearchBox q={q} />

      {promos.length > 0 && (
        <section className="mt-6" aria-labelledby="search-promos">
          <h2 id="search-promos" className="mb-3 text-lg font-bold">
            โปรโมชัน <span className="text-sm font-normal text-muted">({promos.length})</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {promos.map(({ p, status }) => (
              <PromoCard key={p.id} promo={p} status={status} usage={usage[p.id]} categories={categories} products={allProducts} now={now} />
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="mt-6" aria-labelledby="search-products">
          <h2 id="search-products" className="mb-3 text-lg font-bold">
            สินค้า <span className="text-sm font-normal text-muted">({products.length})</span>
          </h2>
          <ProductGrid>
            {products.map((p, i) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} priority={i < 4} />
            ))}
          </ProductGrid>
        </section>
      )}

      {none && <EmptyState icon={<SearchX />} title={`ไม่พบ "${q}"`} description="ลองคำอื่น หรือสะกดให้สั้นลง" />}
    </div>
  );
}
