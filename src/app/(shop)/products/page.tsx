import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { ProductListing, parseSort } from '@/components/shop/product-listing';

export const metadata = { title: 'สินค้าทั้งหมด' };

export default async function ProductsPage({ searchParams }: PageProps<'/products'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const sort = parseSort(sp.sort);
  const [products, categories] = await Promise.all([
    listProducts({ q, activeOnly: true, sort }),
    listCategories({ activeOnly: true }),
  ]);

  return (
    <ProductListing
      title={q ? `ผลการค้นหา "${q}"` : 'สินค้าทั้งหมด'}
      products={products}
      categories={categories}
      q={q}
      sort={sort}
      basePath="/products"
    />
  );
}
