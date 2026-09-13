import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { readCategoryLayout } from '@/lib/prefs';
import { matchesScope } from '@/lib/pricing/quote';
import { ProductListing, parseSort } from '@/components/shop/product-listing';
import { PromoProductCard } from '@/components/shop/promo-product-card';

export const metadata = { title: 'สินค้าทั้งหมด' };

export default async function ProductsPage({ searchParams }: PageProps<'/products'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const sort = parseSort(sp.sort);
  const promoId = typeof sp.promo === 'string' ? sp.promo : '';
  const [all, categories, ctx, layout] = await Promise.all([listProducts({ q, activeOnly: true, sort }), listCategories({ activeOnly: true }), loadPromotionContext(), readCategoryLayout()]);

  // ?promo=<id> = ดูเฉพาะสินค้าที่อยู่ใน scope ของโปรนั้น (ลิงก์จากการ์ดโปร)
  const promo = promoId ? ctx.promotions.find((p) => p.id === promoId) : undefined;
  const products = promo ? all.filter((p) => matchesScope(promo, p)) : all;

  return (
    <ProductListing
      title={promo ? promo.name : q ? `ผลการค้นหา "${q}"` : 'สินค้าทั้งหมด'}
      description={promo ? 'สินค้าที่ร่วมโปรโมชันนี้' : undefined}
      products={products}
      categories={categories}
      q={q}
      sort={sort}
      basePath="/products"
      layout={layout}
      renderCard={(p, i) => <PromoProductCard key={p.id} product={p} ctx={ctx} priority={i < 4} />}
    />
  );
}
