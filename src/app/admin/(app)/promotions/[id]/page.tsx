import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { findPromotion } from '@/lib/db/promotions';
import { deletePromotion } from '@/lib/actions/promotions';
import { PageHeader } from '@/components/admin/page-header';
import { PromotionForm } from '@/components/admin/promotion-form';
import { ConfirmButton } from '@/components/ui/confirm-button';

export const metadata = { title: 'แก้ไขโปรโมชัน' };

export default async function EditPromotionPage({ params }: PageProps<'/admin/promotions/[id]'>) {
  await requirePermission('promotion.manage');
  const { id } = await params;
  const [promotion, categories, products] = await Promise.all([findPromotion(id), listCategories(), listProducts({ sort: 'name' })]);
  if (!promotion) notFound();

  return (
    <div>
      <PageHeader
        title="แก้ไขโปรโมชัน"
        description={promotion.name}
        action={
          <form action={deletePromotion}>
            <input type="hidden" name="id" value={promotion.id} />
            <ConfirmButton variant="danger" message={`ลบโปรโมชัน "${promotion.name}" ? ออเดอร์ที่เคยใช้โปรนี้ยังอยู่ แต่จะไม่มีโปรให้ใช้อีก`}>
              ลบ
            </ConfirmButton>
          </form>
        }
      />
      <PromotionForm promotion={promotion} categories={categories} products={products} />
    </div>
  );
}
