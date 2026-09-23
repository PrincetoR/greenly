import { requirePermission } from '@/lib/auth/session';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleForm } from '@/components/admin/article-form';

export const metadata = { title: 'เพิ่มบทความ' };

export default async function NewArticlePage() {
  const session = await requirePermission('article.manage');
  return (
    <div>
      <PageHeader title="เพิ่มบทความ" />
      {/* ผู้เขียนเริ่มต้น = ชื่อคนที่ล็อกอิน (แก้ได้) */}
      <ArticleForm defaultAuthor={session.user.name} />
    </div>
  );
}
