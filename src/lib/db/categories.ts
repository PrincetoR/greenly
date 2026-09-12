import 'server-only';
import type { Category } from '@/lib/types';
import { newId, readCollection, updateCollection } from './store';

const NAME = 'categories';

export async function listCategories(opts: { activeOnly?: boolean } = {}): Promise<Category[]> {
  const items = await readCollection<Category>(NAME);
  return items
    .filter((c) => !opts.activeOnly || c.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'th'));
}

export async function findCategory(id: string): Promise<Category | undefined> {
  return (await readCollection<Category>(NAME)).find((c) => c.id === id);
}

export async function findCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await readCollection<Category>(NAME)).find((c) => c.slug === slug);
}

export async function createCategory(input: Omit<Category, 'id'>): Promise<Category> {
  const category: Category = { id: newId('c'), ...input };
  await updateCollection<Category>(NAME, (items) => [...items, category]);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id'>>,
): Promise<Category | undefined> {
  let updated: Category | undefined;
  await updateCollection<Category>(NAME, (items) =>
    items.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...patch };
      return updated;
    }),
  );
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  await updateCollection<Category>(NAME, (items) => items.filter((c) => c.id !== id));
}
