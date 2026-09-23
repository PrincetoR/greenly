import Link from 'next/link';
import { Newspaper, Plus } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { listArticles } from '@/lib/db/articles';
import { toggleArticlePublished } from '@/lib/actions/articles';
import { formatDateTime } from '@/lib/datetime';
import { PageHeader } from '@/components/admin/page-header';
import { ArticleCover } from '@/components/shop/article-card';
import { Table, Td, Th } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata = { title: 'บทความ' };

/** สถานะที่ลูกค้าเห็นจริง: ฉบับร่าง → ยังไม่เผยแพร่ · ตั้งเวลา → ถึงเวลาแล้วค่อยขึ้น · เผยแพร่แล้ว */
function statusOf(published: boolean, publishedAt: string, now: Date) {
  if (!published) return { label: 'ฉบับร่าง', tone: 'neutral' as const };
  if (new Date(publishedAt).getTime() > now.getTime()) return { label: 'ตั้งเวลา', tone: 'info' as const };
  return { label: 'เผยแพร่แล้ว', tone: 'ok' as const };
}

export default async function AdminArticlesPage({ searchParams }: PageProps<'/admin/articles'>) {
  await requirePermission('article.manage');
  const sp = await searchParams;
  const articles = await listArticles();
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="บทความ"
        description={`ทั้งหมด ${articles.length} บทความ`}
        action={
          <Link href="/admin/articles/new" className={buttonStyles()}>
            <Plus className="size-4" aria-hidden />
            เพิ่มบทความ
          </Link>
        }
      />

      {sp.saved && (
        <Alert tone="ok" className="mb-4">
          บันทึกบทความแล้ว
        </Alert>
      )}

      {articles.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title="ยังไม่มีบทความ"
          description="เขียนบทความแรกเพื่อให้ลูกค้าอ่านเรื่องน่ารู้เกี่ยวกับสินค้า"
          action={
            <Link href="/admin/articles/new" className={buttonStyles()}>
              เพิ่มบทความ
            </Link>
          }
        />
      ) : (
        <>
          {/* ตารางบน desktop */}
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>หัวข้อ</Th>
                  <Th>slug</Th>
                  <Th>เผยแพร่</Th>
                  <Th>สถานะ</Th>
                  <Th className="w-44" />
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const s = statusOf(a.published, a.publishedAt, now);
                  return (
                    <tr key={a.id} className="hover:bg-surface-alt/50">
                      <Td className="font-medium">
                        <span className="flex items-center gap-3">
                          <ArticleCover src={a.cover} alt="" className="w-16 shrink-0 rounded-md" />
                          <span className="min-w-0">{a.title}</span>
                        </span>
                      </Td>
                      <Td className="font-mono text-xs text-muted">{a.slug}</Td>
                      <Td className="text-sm text-muted">{formatDateTime(a.publishedAt)}</Td>
                      <Td>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </Td>
                      <Td>
                        <RowActions id={a.id} published={a.published} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>

          {/* card list บนมือถือ */}
          <ul className="flex flex-col gap-3 md:hidden">
            {articles.map((a) => {
              const s = statusOf(a.published, a.publishedAt, now);
              return (
                <li key={a.id} className="rounded-card bg-surface p-4 border border-line">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{a.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{formatDateTime(a.publishedAt)}</p>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <RowActions id={a.id} published={a.published} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function RowActions({ id, published }: { id: string; published: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      <form action={toggleArticlePublished}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="secondary" size="sm">
          {published ? 'พักไว้' : 'เผยแพร่'}
        </Button>
      </form>
      <Link href={`/admin/articles/${id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
        แก้ไข
      </Link>
    </div>
  );
}
