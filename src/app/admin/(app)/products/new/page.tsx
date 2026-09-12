import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { PageHeader } from '@/components/admin/page-header';
import { ProductForm } from '@/components/admin/product-form';

export const metadata = { title: 'เพิ่มสินค้า' };

export default async function NewProductPage() {
  await requirePermission('catalog.manage');
  const categories = await listCategories();
  return (
    <div>
      <PageHeader title="เพิ่มสินค้า" />
      <ProductForm categories={categories} />
    </div>
  );
}
