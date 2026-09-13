import 'server-only';
import { cookies } from 'next/headers';
import { ensureGuestId, readGuestId } from '@/lib/guest';
import { readCartRecord, saveCartRecord } from '@/lib/db/carts';

/**
 * ตะกร้าเก็บฝั่ง server (data/carts.json) ผูกกับ guest id ใน cookie
 * → ปิดเบราว์เซอร์แล้วกลับมาตะกร้ายังอยู่ และไม่ติดขีดจำกัดขนาด cookie
 * เก็บแค่ productId + qty ราคาไม่เก็บ เพราะต้องคิดใหม่ทุกครั้งจาก pricing engine
 */
export const MAX_QTY_PER_LINE = 99;
/** cookie ตะกร้ารุ่นแรก — ยังอ่านได้เพื่อย้ายของเข้าตะกร้าใหม่ให้ลูกค้าเก่า */
const LEGACY_CART_COOKIE = 'ec_cart';

export interface CartItem {
  productId: string;
  qty: number;
}

function sanitize(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((i): i is CartItem => typeof i === 'object' && i !== null && typeof i.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0)
    .map((i) => ({ productId: i.productId, qty: Math.min(i.qty, MAX_QTY_PER_LINE) }));
}

async function readLegacyCookie(): Promise<CartItem[]> {
  const raw = (await cookies()).get(LEGACY_CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** รวมสองรายการ — จำนวนบวกกัน ไม่เกินเพดานต่อบรรทัด */
function merge(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, number>();
  for (const i of [...a, ...b]) map.set(i.productId, Math.min((map.get(i.productId) ?? 0) + i.qty, MAX_QTY_PER_LINE));
  return [...map].map(([productId, qty]) => ({ productId, qty }));
}

export async function readCart(): Promise<CartItem[]> {
  const guestId = await readGuestId();
  const server = guestId ? sanitize((await readCartRecord(guestId)).items) : [];
  const legacy = await readLegacyCookie();
  return legacy.length ? merge(server, legacy) : server;
}

/** เขียนได้เฉพาะใน server action — สร้าง guest id ให้ถ้ายังไม่มี และล้าง cookie รุ่นเก่า */
export async function writeCart(items: CartItem[]): Promise<void> {
  const guestId = await ensureGuestId();
  await saveCartRecord(guestId, { items: sanitize(items) });
  const store = await cookies();
  if (store.get(LEGACY_CART_COOKIE)) store.delete(LEGACY_CART_COOKIE);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/* ---------- คูปองที่ลูกค้ากรอก — เก็บใน record เดียวกับตะกร้า ---------- */

export async function readCoupon(): Promise<string | null> {
  const guestId = await readGuestId();
  if (!guestId) return null;
  const code = (await readCartRecord(guestId)).couponCode?.trim();
  return code ? code.toUpperCase() : null;
}

export async function writeCoupon(code: string | null): Promise<void> {
  const guestId = await ensureGuestId();
  await saveCartRecord(guestId, { couponCode: code ? code.toUpperCase() : null });
}
