import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findCategory } from '@/lib/db/categories';
import { findProductBySlug, listProducts } from '@/lib/db/products';
import { getSettings } from '@/lib/db/settings';
import { formatBaht } from '@/lib/money';
import { Gallery } from '@/components/shop/gallery';
import { AddToCart } from '@/components/shop/add-to-cart';
import { ProductCard, ProductGrid } from '@/components/shop/product-card';
import { Section } from '@/components/shop/section';
import { Badge } from '@/components/ui/badge';
import { decodeSlug } from '@/lib/validation/common';

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const product = await findProductBySlug(decodeSlug(slug));
  return { title: product?.name ?? 'สินค้า', description: product?.description.slice(0, 160) };
}

export default async function ProductPage({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const product = await findProductBySlug(decodeSlug(slug));
  if (!product || !product.active) notFound();

  const [category, settings, related] = await Promise.all([
    findCategory(product.categoryId),
    getSettings(),
    listProducts({ categoryId: product.categoryId, activeOnly: true, sort: 'newest' }),
  ]);
  const others = related.filter((p) => p.id !== product.id).slice(0, 4);
  const lowStock = product.stock > 0 && product.stock <= settings.lowStockThreshold;

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

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-bold">{formatBaht(product.price)}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {product.stock <= 0 ? (
                <Badge tone="danger">สินค้าหมด</Badge>
              ) : lowStock ? (
                <Badge tone="warn">เหลือเพียง {product.stock} ชิ้น</Badge>
              ) : (
                <Badge tone="ok">พร้อมส่ง</Badge>
              )}
              {settings.freeShippingMin !== null && (
                <Badge tone="info">ส่งฟรีเมื่อซื้อครบ {formatBaht(settings.freeShippingMin)}</Badge>
              )}
            </div>

            {/* desktop: ปุ่มอยู่ในหน้า · mobile: ย้ายไปแถบ sticky ด้านล่าง */}
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
              <ProductCard key={p.id} product={p} />
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
