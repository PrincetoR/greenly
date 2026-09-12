import 'server-only';
import { cookies } from 'next/headers';

/**
 * ตะกร้าเก็บใน cookie ตรง ๆ — ไม่มีบัญชีลูกค้าจึงไม่ต้องมีตารางตะกร้า
 * เก็บแค่ productId + qty ราคาไม่เก็บ เพราะต้องคิดใหม่ทุกครั้งจาก pricing engine
 */
export const CART_COOKIE = 'ec_cart';
export const MAX_QTY_PER_LINE = 99;

export interface CartItem {
  productId: string;
  qty: number;
}

export async function readCart(): Promise<CartItem[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          typeof i === 'object' && i !== null && typeof i.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0,
      )
      .map((i) => ({ productId: i.productId, qty: Math.min(i.qty, MAX_QTY_PER_LINE) }));
  } catch {
    return [];
  }
}

/** เขียนได้เฉพาะใน server action / route handler */
export async function writeCart(items: CartItem[]): Promise<void> {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(items), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

/* ---------- คูปองที่ลูกค้ากรอก — เก็บใน cookie แยกจากตะกร้า ---------- */
export const COUPON_COOKIE = 'ec_coupon';

export async function readCoupon(): Promise<string | null> {
  const v = (await cookies()).get(COUPON_COOKIE)?.value?.trim();
  return v ? v.toUpperCase() : null;
}

export async function writeCoupon(code: string | null): Promise<void> {
  const store = await cookies();
  if (!code) store.delete(COUPON_COOKIE);
  else store.set(COUPON_COOKIE, code.toUpperCase(), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
}
