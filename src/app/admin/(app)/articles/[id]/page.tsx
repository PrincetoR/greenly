import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { findArticle } from '@/lib/db/articles';
import { deleteArticle } from '@/lib/actions/articles';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleForm } from '@/components/admin/article-form';
import { ConfirmButton } from '@/components/ui/confirm-button';

export const metadata = { title: 'แก้ไขบทความ' };

export default async function EditArticlePage({ params }: PageProps<'/admin/articles/[id]'>) {
  const session = await requirePermission('article.manage');
  const { id } = await params;
  const article = await findArticle(id);
  if (!article) notFound();

  return (
    <div>
      <PageHeader
        title="แก้ไขบทความ"
        description={article.slug}
        action={
          <form action={deleteArticle}>
            <input type="hidden" name="id" value={article.id} />
            <ConfirmButton variant="danger" message={`ลบบทความ "${article.title}" ? การลบย้อนกลับไม่ได้`}>
              ลบบทความ
            </ConfirmButton>
          </form>
        }
      />
      <ArticleForm article={article} defaultAuthor={session.user.name} />
    </div>
  );
}
