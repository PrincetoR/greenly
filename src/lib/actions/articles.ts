'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import * as articles from '@/lib/db/articles';
import { articleSchema } from '@/lib/validation/article';
import { fieldErrors, formValues, type FormState } from '@/lib/validation/common';

function revalidateArticles() {
  // หน้าร้าน (/articles, /articles/[slug], ค้นหา) และหลังบ้านอ่านชุดเดียวกัน
  revalidatePath('/', 'layout');
}

export async function saveArticle(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('article.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = articleSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    excerpt: formData.get('excerpt') ?? '',
    body: formData.get('body') ?? '',
    author: formData.get('author') ?? '',
    cover: formData.get('cover') ?? '',
    published: formData.get('published'),
    publishedAt: formData.get('publishedAt') ?? '',
  });
  const values = formValues(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const dup = await articles.findArticleBySlug(parsed.data.slug);
  if (dup && dup.id !== id) return { errors: { slug: 'slug นี้ถูกใช้แล้ว' }, values };

  if (id) await articles.updateArticle(id, parsed.data);
  else await articles.createArticle(parsed.data);
  revalidateArticles();
  redirect('/admin/articles?saved=1');
}

export async function toggleArticlePublished(formData: FormData): Promise<void> {
  await requirePermission('article.manage');
  const id = String(formData.get('id') ?? '');
  const article = await articles.findArticle(id);
  if (article) await articles.updateArticle(id, { published: !article.published });
  revalidateArticles();
}

export async function deleteArticle(formData: FormData): Promise<void> {
  await requirePermission('article.manage');
  await articles.deleteArticle(String(formData.get('id') ?? ''));
  revalidateArticles();
  redirect('/admin/articles');
}
