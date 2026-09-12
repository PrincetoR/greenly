import 'server-only';
import type { Product } from '@/lib/types';
import { newId, nowIso, readCollection, updateCollection } from './store';

const NAME = 'products';

export interface ProductQuery {
  /** ค้นหาจากชื่อ / sku / คำอธิบาย (ไม่สนตัวพิมพ์) */
  q?: string;
  categoryId?: string;
  activeOnly?: boolean;
  featuredOnly?: boolean;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'name';
}

export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const items = await readCollection<Product>(NAME);
  const q = query.q?.trim().toLowerCase();

  const filtered = items.filter((p) => {
    if (query.activeOnly && !p.active) return false;
    if (query.featuredOnly && !p.featured) return false;
    if (query.categoryId && p.categoryId !== query.categoryId) return false;
    if (q) {
      const hay = `${p.name} ${p.sku} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  switch (query.sort) {
    case 'price-asc':
      return filtered.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return filtered.sort((a, b) => b.price - a.price);
    case 'name':
      return filtered.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    case 'newest':
    default:
      return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function findProduct(id: string): Promise<Product | undefined> {
  return (await readCollection<Product>(NAME)).find((p) => p.id === id);
}

export async function findProductBySlug(slug: string): Promise<Product | undefined> {
  return (await readCollection<Product>(NAME)).find((p) => p.slug === slug);
}

export async function findProductsByIds(ids: string[]): Promise<Product[]> {
  const set = new Set(ids);
  return (await readCollection<Product>(NAME)).filter((p) => set.has(p.id));
}

export async function createProduct(
  input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Product> {
  const now = nowIso();
  const product: Product = { id: newId('p'), ...input, createdAt: now, updatedAt: now };
  await updateCollection<Product>(NAME, (items) => [...items, product]);
  return product;
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, 'id' | 'createdAt'>>,
): Promise<Product | undefined> {
  let updated: Product | undefined;
  await updateCollection<Product>(NAME, (items) =>
    items.map((p) => {
      if (p.id !== id) return p;
      updated = { ...p, ...patch, updatedAt: nowIso() };
      return updated;
    }),
  );
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  await updateCollection<Product>(NAME, (items) => items.filter((p) => p.id !== id));
}

/**
 * ตัด stock หลาย ๆ ตัวใน transaction เดียว — ถ้าตัวใดไม่พอ ไม่ตัดเลยสักตัว
 * คืน id ของสินค้าที่ stock ไม่พอ (ว่าง = สำเร็จ)
 */
export async function decrementStock(items: { productId: string; qty: number }[]): Promise<string[]> {
  const shortage: string[] = [];
  await updateCollection<Product>(NAME, (products) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const { productId, qty } of items) {
      const p = byId.get(productId);
      if (!p || !p.active || p.stock < qty) shortage.push(productId);
    }
    if (shortage.length > 0) return products;
    const now = nowIso();
    return products.map((p) => {
      const line = items.find((i) => i.productId === p.id);
      return line ? { ...p, stock: p.stock - line.qty, updatedAt: now } : p;
    });
  });
  return shortage;
}

/** คืน stock เมื่อยกเลิก order — สินค้าที่ถูกลบไปแล้วข้าม */
export async function restoreStock(items: { productId: string; qty: number }[]): Promise<void> {
  await updateCollection<Product>(NAME, (products) => {
    const now = nowIso();
    return products.map((p) => {
      const back = items.filter((i) => i.productId === p.id).reduce((s, i) => s + i.qty, 0);
      return back > 0 ? { ...p, stock: p.stock + back, updatedAt: now } : p;
    });
  });
}
