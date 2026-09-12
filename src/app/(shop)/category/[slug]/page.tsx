import { notFound } from 'next/navigation';
import { findCategoryBySlug, listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { ProductListing, parseSort } from '@/components/shop/product-listing';
import { decodeSlug } from '@/lib/validation/common';

export async function generateMetadata({ params }: PageProps<'/category/[slug]'>) {
  const { slug } = await params;
  const category = await findCategoryBySlug(decodeSlug(slug));
  return { title: category?.name ?? 'หมวดหมู่' };
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await findCategoryBySlug(decodeSlug(slug));
  if (!category || !category.active) notFound();

  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const sort = parseSort(sp.sort);
  const [products, categories] = await Promise.all([
    listProducts({ q, categoryId: category.id, activeOnly: true, sort }),
    listCategories({ activeOnly: true }),
  ]);

  return (
    <ProductListing
      title={category.name}
      products={products}
      categories={categories}
      current={category}
      q={q}
      sort={sort}
      basePath={`/category/${category.slug}`}
    />
  );
}
