import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { listArticles } from '@/lib/db/articles';
import { ArticleCard, ArticleGrid } from '@/components/shop/article-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'บทความ' };

/** รายการบทความทั้งหมดที่เผยแพร่แล้ว — ใหม่สุดขึ้นก่อน (บทความตั้งเวลาไว้ล่วงหน้ายังไม่ขึ้น) */
export default async function ArticlesPage() {
  const articles = await listArticles({ visibleOnly: true });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8">
      {/* ระยะบน/ล่างอยู่ที่ wrapper — แถวหัวข้อสูง 40 เท่าหน้ารายการสินค้า (h-10 นับรวม padding ถ้าใส่ปนกันข้อความจะล้นทับการ์ด) */}
      <div className="pt-4 pb-3 sm:pb-4">
        <div className="flex h-10 items-baseline gap-2">
          <h1 className="truncate text-2xl leading-10 font-bold">บทความทั้งหมด</h1>
          <span className="shrink-0 text-sm text-muted">{articles.length} บทความ</span>
        </div>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={<Newspaper />}
          title="ยังไม่มีบทความ"
          description="ติดตามสาระน่ารู้และวิธีเลือกสินค้าได้เร็ว ๆ นี้"
          action={
            <Link href="/products" className={buttonStyles()}>
              ดูสินค้าทั้งหมด
            </Link>
          }
        />
      ) : (
        <ArticleGrid>
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} priority={i < 3} />
          ))}
        </ArticleGrid>
      )}
    </div>
  );
}
