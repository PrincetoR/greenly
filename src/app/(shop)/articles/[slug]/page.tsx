import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findArticleBySlug, isVisible, listArticles } from '@/lib/db/articles';
import { decodeSlug } from '@/lib/validation/common';
import { formatDate } from '@/lib/datetime';
import { ArticleBody } from '@/components/shop/article-body';
import { ArticleCard, ArticleCover, ArticleGrid } from '@/components/shop/article-card';
import { BackButton } from '@/components/shop/back-button';
import { buttonStyles } from '@/components/ui/button';

export async function generateMetadata({ params }: PageProps<'/articles/[slug]'>) {
  const { slug } = await params;
  const article = await findArticleBySlug(decodeSlug(slug));
  return article ? { title: article.title, description: article.excerpt } : { title: 'ไม่พบบทความ' };
}

/** หน้าอ่านบทความ — คอลัมน์เดียวอ่านง่าย (ปุ่มกลับแทน breadcrumb เหมือนหน้าสินค้า) + บทความอื่นท้ายหน้า */
export default async function ArticlePage({ params }: PageProps<'/articles/[slug]'>) {
  const { slug } = await params;
  const article = await findArticleBySlug(decodeSlug(slug));
  // ฉบับร่าง/ตั้งเวลาไว้ = ยังไม่มีในสายตาลูกค้า
  if (!article || !isVisible(article)) notFound();

  const others = (await listArticles({ visibleOnly: true })).filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-10">
      <BackButton fallback="/articles" />

      <article className="mt-3">
        <h1 className="text-2xl leading-10 font-bold sm:text-3xl sm:leading-12">{article.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {formatDate(article.publishedAt)}
          {article.author && ` · โดย ${article.author}`}
        </p>
        {article.cover && <ArticleCover src={article.cover} alt={article.title} priority className="mt-4 rounded-card" />}
        <div className="mt-5">
          <ArticleBody body={article.body} />
        </div>
      </article>

      {others.length > 0 && (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="other-articles">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="other-articles" className="text-lg font-bold">
              บทความอื่น
            </h2>
            <Link href="/articles" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              ดูทั้งหมด
            </Link>
          </div>
          <ArticleGrid>
            {others.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </ArticleGrid>
        </section>
      )}
    </div>
  );
}
