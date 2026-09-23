import Link from 'next/link';
import { Newspaper } from 'lucide-react';
import type { Article } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/cn';

/** รูปปกบทความ 16:9 — ไม่มีรูปใช้พื้น brand-soft + ไอคอน (ProductImage เป็นสี่เหลี่ยม/4:3 ของสินค้า) */
export function ArticleCover({ src, alt, className, priority }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className={cn('flex aspect-[16/9] items-center justify-center bg-brand-soft text-brand', className)} aria-hidden>
        <Newspaper className="size-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" className={cn('aspect-[16/9] w-full bg-surface-alt object-cover', className)} />
  );
}

/**
 * การ์ดบทความในกริด — วันที่ · หัวข้อ 2 บรรทัด · สรุป 2 บรรทัด
 * line-height สูง (leading-7/6) เพราะ line-clamp ตัดหัววรรณยุกต์ไทยถ้าบรรทัดเตี้ย
 */
export function ArticleCard({ article, priority }: { article: Article; priority?: boolean }) {
  return (
    <article className="group card-hover flex flex-col overflow-hidden rounded-card bg-surface border border-line">
      <Link href={`/articles/${article.slug}`} className="flex flex-1 flex-col">
        <div className="overflow-hidden">
          <ArticleCover src={article.cover} alt={article.title} priority={priority} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        </div>
        <div className="flex flex-1 flex-col p-3">
          <p className="text-xs text-muted">{formatDate(article.publishedAt)}</p>
          <h3 className="mt-1 line-clamp-2 leading-7 font-semibold transition-colors group-hover:text-brand">{article.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{article.excerpt}</p>
        </div>
      </Link>
    </article>
  );
}

export function ArticleGrid({ children }: { children: React.ReactNode }) {
  // gap 12 เท่ากริดอื่นทั้งเว็บ
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
