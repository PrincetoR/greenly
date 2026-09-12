import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findCategory } from '@/lib/db/categories';
import { findProductBySlug, listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { displayPrice } from '@/lib/pricing/quote';
import { formatBaht } from '@/lib/money';
import { humanCountdown } from '@/lib/datetime';
import { decodeSlug } from '@/lib/validation/common';
import { Gallery } from '@/components/shop/gallery';
import { AddToCart } from '@/components/shop/add-to-cart';
import { ProductGrid } from '@/components/shop/product-card';
import { PromoProductCard } from '@/components/shop/promo-product-card';
import { PriceTag } from '@/components/shop/price-tag';
import { Countdown } from '@/components/shop/countdown';
import { Section } from '@/components/shop/section';
import { Badge } from '@/components/ui/badge';

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const product = await findProductBySlug(decodeSlug(slug));
  return { title: product?.name ?? 'สินค้า', description: product?.description.slice(0, 160) };
}

export default async function ProductPage({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const product = await findProductBySlug(decodeSlug(slug));
  if (!product || !product.active) notFound();

  const [category, ctx, related] = await Promise.all([
    findCategory(product.categoryId),
    loadPromotionContext(),
    listProducts({ categoryId: product.categoryId, activeOnly: true, sort: 'newest' }),
  ]);
  const { settings, usage, now } = ctx;
  const others = related.filter((p) => p.id !== product.id).slice(0, 4);
  const lowStock = product.stock > 0 && product.stock <= settings.lowStockThreshold;
  const d = displayPrice(product, ctx.promotions, usage, now);

  /** สิทธิ์โปรที่เหลือสำหรับสินค้าตัวนี้ (ถ้าโปรจำกัดชิ้นต่อสินค้า) */
  const remaining = (promoId: string | undefined, limit: number | null | undefined) =>
    promoId && limit != null ? Math.max(0, limit - (usage[promoId]?.perProduct[product.id] ?? 0)) : null;
  const discountLeft = remaining(d.promotion?.id, d.promotion?.limits.perProductQty);
  const bogoLeft = remaining(d.bogo?.id, d.bogo?.limits.perProductQty);

  return (
    <div className="pb-28 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href="/" className="hover:text-ink">หน้าแรก</Link>
          <span aria-hidden>›</span>
          <Link href="/products" className="hover:text-ink">สินค้า</Link>
          {category && (
            <>
              <span aria-hidden>›</span>
              <Link href={`/category/${category.slug}`} className="hover:text-ink">{category.name}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <Gallery images={product.images} alt={product.name} />

          <div>
            {category && (
              <Link href={`/category/${category.slug}`} className="text-sm font-medium text-brand hover:underline">
                {category.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <p className="mt-1 font-mono text-xs text-muted">SKU {product.sku}</p>

            <div className="mt-4">
              <PriceTag price={d.price} original={d.original} size="lg" />
            </div>

            {/* กล่องโปรที่ใช้กับสินค้านี้ */}
            {(d.promotion || d.bogo) && (
              <ul className="mt-3 flex flex-col gap-2">
                {d.promotion && (
                  <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-accent-soft px-3 py-2 text-sm">
                    <span aria-hidden>🏷️</span>
                    <span className="font-semibold text-accent">{d.promotion.name}</span>
                    <span className="text-muted">
                      <Countdown to={d.promotion.endsAt} initial={humanCountdown(d.promotion.endsAt, now)} />
                    </span>
                    {discountLeft !== null && <span className="text-muted">· ราคาโปรเหลือ {discountLeft} ชิ้น</span>}
                  </li>
                )}
                {d.bogo && (
                  <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-brand-soft px-3 py-2 text-sm">
                    <span aria-hidden>🎁</span>
                    <span className="font-semibold text-brand">
                      ซื้อ {d.bogo.bogo!.buyQty} แถม {d.bogo.bogo!.getQty}
                    </span>
                    <span className="text-muted">
                      <Countdown to={d.bogo.endsAt} initial={humanCountdown(d.bogo.endsAt, now)} />
                    </span>
                    {bogoLeft !== null && <span className="text-muted">· ของแถมเหลือ {bogoLeft} ชิ้น</span>}
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {product.stock <= 0 ? (
                <Badge tone="danger">สินค้าหมด</Badge>
              ) : lowStock ? (
                <Badge tone="warn">เหลือเพียง {product.stock} ชิ้น</Badge>
              ) : (
                <Badge tone="ok">พร้อมส่ง</Badge>
              )}
              {settings.freeShippingMin !== null && <Badge tone="info">ส่งฟรีเมื่อซื้อครบ {formatBaht(settings.freeShippingMin)}</Badge>}
            </div>

            <div className="mt-6 hidden md:block">
              <AddToCart productId={product.id} stock={product.stock} />
            </div>

            {product.description && (
              <div className="mt-8">
                <h2 className="font-semibold">รายละเอียดสินค้า</h2>
                <p className="mt-2 text-muted whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <Section title="สินค้าในหมวดเดียวกัน" href={category ? `/category/${category.slug}` : '/products'}>
          <ProductGrid>
            {others.map((p) => (
              <PromoProductCard key={p.id} product={p} ctx={ctx} />
            ))}
          </ProductGrid>
        </Section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur md:hidden">
        <AddToCart productId={product.id} stock={product.stock} />
      </div>
    </div>
  );
}
