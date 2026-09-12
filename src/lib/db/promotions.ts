import 'server-only';
import type { Promotion } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'promotions';

export async function listPromotions(): Promise<Promotion[]> {
  const items = await readCollection<Promotion>(NAME);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findPromotion(id: string): Promise<Promotion | undefined> {
  return (await readCollection<Promotion>(NAME)).find((p) => p.id === id);
}

export async function findPromotionByCode(code: string): Promise<Promotion | undefined> {
  const needle = code.trim().toUpperCase();
  return (await readCollection<Promotion>(NAME)).find(
    (p) => p.type === 'coupon' && p.coupon?.code.toUpperCase() === needle,
  );
}

export async function createPromotion(
  input: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Promotion> {
  const now = nowIso();
  const promotion: Promotion = { id: newId('promo'), ...input, createdAt: now, updatedAt: now };
  await updateCollection<Promotion>(NAME, (items) => [...items, promotion]);
  return promotion;
}

export async function updatePromotion(
  id: string,
  patch: Partial<Omit<Promotion, 'id' | 'createdAt'>>,
): Promise<Promotion | undefined> {
  let updated: Promotion | undefined;
  await updateCollection<Promotion>(NAME, (items) =>
    items.map((p) => {
      if (p.id !== id) return p;
      updated = { ...p, ...patch, updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}

export async function deletePromotion(id: string): Promise<void> {
  await updateCollection<Promotion>(NAME, (items) => items.filter((p) => p.id !== id));
}
