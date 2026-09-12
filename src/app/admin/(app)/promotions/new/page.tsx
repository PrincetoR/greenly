import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { PageHeader } from '@/components/admin/page-header';
import { PromotionForm } from '@/components/admin/promotion-form';

export const metadata = { title: 'สร้างโปรโมชัน' };

export default async function NewPromotionPage() {
  await requirePermission('promotion.manage');
  const [categories, products] = await Promise.all([listCategories(), listProducts({ sort: 'name' })]);
  return (
    <div>
      <PageHeader title="สร้างโปรโมชัน" description="ตอบ 5 ข้อ แล้วกดสร้าง — แก้ไขได้ทุกเมื่อ" />
      <PromotionForm categories={categories} products={products} />
    </div>
  );
}
