import 'server-only';
import { nowIso, readDocument, updateDocument } from './store';

/**
 * ตะกร้าฝั่ง server ผูกกับ guest id — เก็บแค่ productId/qty และโค้ดคูปอง
 * ราคาไม่เก็บ เพราะต้องคิดใหม่ทุกครั้งจาก pricing engine
 */
export interface CartRecord {
  items: { productId: string; qty: number }[];
  couponCode: string | null;
  updatedAt: string;
}

type CartsDoc = Record<string, CartRecord>;
const NAME = 'carts';
const EMPTY: CartRecord = { items: [], couponCode: null, updatedAt: '' };

export async function readCartRecord(guestId: string): Promise<CartRecord> {
  const doc = await readDocument<CartsDoc>(NAME, {});
  return doc[guestId] ?? EMPTY;
}

export async function saveCartRecord(guestId: string, patch: Partial<Omit<CartRecord, 'updatedAt'>>): Promise<CartRecord> {
  let saved: CartRecord = EMPTY;
  await updateDocument<CartsDoc>(NAME, {}, (doc) => {
    const cur = doc[guestId] ?? EMPTY;
    saved = { ...cur, ...patch, updatedAt: nowIso() };
    // ตะกร้าว่างและไม่มีคูปอง → ลบ record ทิ้ง ไม่ให้ไฟล์บวมด้วย guest ที่ไม่เคยซื้อ
    if (saved.items.length === 0 && !saved.couponCode) {
      const rest = { ...doc };
      delete rest[guestId];
      return rest;
    }
    return { ...doc, [guestId]: saved };
  });
  return saved;
}
