import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { findProduct } from '@/lib/db/products';
import { deleteProduct } from '@/lib/actions/catalog';
import { PageHeader } from '@/components/admin/page-header';
import { ProductForm } from '@/components/admin/product-form';
import { ConfirmButton } from '@/components/ui/confirm-button';

export const metadata = { title: 'แก้ไขสินค้า' };

export default async function EditProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  await requirePermission('catalog.manage');
  const { id } = await params;
  const [product, categories] = await Promise.all([findProduct(id), listCategories()]);
  if (!product) notFound();

  return (
    <div>
      <PageHeader
        title="แก้ไขสินค้า"
        description={product.sku}
        action={
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <ConfirmButton variant="danger" message={`ลบสินค้า "${product.name}" ? การลบย้อนกลับไม่ได้`}>
              ลบสินค้า
            </ConfirmButton>
          </form>
        }
      />
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
