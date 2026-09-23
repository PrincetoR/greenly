import 'server-only';
import type { Article } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'articles';

/** บทความที่ลูกค้าเห็น = เผยแพร่แล้ว และถึงเวลาโพสต์ (ตั้งเวลาล่วงหน้าได้เหมือนโปรโมชัน) */
export function isVisible(a: Article, now: Date = new Date()): boolean {
  return a.published && new Date(a.publishedAt).getTime() <= now.getTime();
}

export async function listArticles(opts: { visibleOnly?: boolean; q?: string; now?: Date } = {}): Promise<Article[]> {
  const items = await readCollection<Article>(NAME);
  const needle = opts.q?.trim().toLowerCase();
  return items
    .filter((a) => !opts.visibleOnly || isVisible(a, opts.now))
    .filter((a) => !needle || `${a.title} ${a.excerpt} ${a.body}`.toLowerCase().includes(needle))
    // ใหม่สุดขึ้นก่อน — ฉบับร่างที่ยังไม่ตั้งเวลาก็เรียงตาม publishedAt เหมือนกัน
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function findArticle(id: string): Promise<Article | undefined> {
  return (await readCollection<Article>(NAME)).find((a) => a.id === id);
}

export async function findArticleBySlug(slug: string): Promise<Article | undefined> {
  return (await readCollection<Article>(NAME)).find((a) => a.slug === slug);
}

export async function createArticle(input: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article> {
  const at = nowIso();
  const article: Article = { id: newId('a'), ...input, createdAt: at, updatedAt: at };
  await updateCollection<Article>(NAME, (items) => [...items, article]);
  return article;
}

export async function updateArticle(id: string, patch: Partial<Omit<Article, 'id' | 'createdAt'>>): Promise<Article | undefined> {
  let updated: Article | undefined;
  await updateCollection<Article>(NAME, (items) =>
    items.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...patch, updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}

export async function deleteArticle(id: string): Promise<void> {
  await updateCollection<Article>(NAME, (items) => items.filter((a) => a.id !== id));
}
