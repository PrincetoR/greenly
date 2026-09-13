'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MAX_QTY_PER_LINE, readCart, writeCart, writeCoupon, type CartItem } from '@/lib/cart/storage';
import { findProduct } from '@/lib/db/products';

export interface CartActionState {
  ok?: boolean;
  message?: string;
}

/** จำนวนที่ใส่ได้จริง = ไม่เกิน stock และไม่เกินเพดานต่อบรรทัด */
function clampQty(qty: number, stock: number): number {
  return Math.max(0, Math.min(qty, stock, MAX_QTY_PER_LINE));
}

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const productId = String(formData.get('productId') ?? '');
  const qty = Number(formData.get('qty') ?? 1);
  if (!Number.isInteger(qty) || qty < 1) return { message: 'จำนวนไม่ถูกต้อง' };

  const product = await findProduct(productId);
  if (!product || !product.active) return { message: 'ไม่พบสินค้านี้' };
  if (product.stock <= 0) return { message: 'สินค้าหมดชั่วคราว' };

  const cart = await readCart();
  const existing = cart.find((i) => i.productId === productId);
  const wanted = (existing?.qty ?? 0) + qty;
  const allowed = clampQty(wanted, product.stock);
  const next: CartItem[] = existing
    ? cart.map((i) => (i.productId === productId ? { ...i, qty: allowed } : i))
    : [...cart, { productId, qty: allowed }];
  await writeCart(next);
  revalidatePath('/', 'layout');

  if (allowed < wanted) return { ok: true, message: `ใส่ตะกร้าได้สูงสุด ${allowed} ชิ้น (ตามจำนวนคงเหลือ)` };
  return { ok: true, message: `ใส่ตะกร้าแล้ว ${qty} ชิ้น` };
}

export async function updateCartQty(formData: FormData): Promise<void> {
  const productId = String(formData.get('productId') ?? '');
  const qty = Number(formData.get('qty') ?? 0);
  const product = await findProduct(productId);
  const cart = await readCart();
  const allowed = product ? clampQty(Number.isInteger(qty) ? qty : 0, product.stock) : 0;
  const next = allowed > 0 ? cart.map((i) => (i.productId === productId ? { ...i, qty: allowed } : i)) : cart.filter((i) => i.productId !== productId);
  await writeCart(next);
  revalidatePath('/', 'layout');
  redirect('/cart');
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const productId = String(formData.get('productId') ?? '');
  await writeCart((await readCart()).filter((i) => i.productId !== productId));
  revalidatePath('/', 'layout');
  redirect('/cart');
}

/* ---------- คูปอง ---------- */

export async function applyCoupon(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  if (!code) {
    await writeCoupon(null);
    revalidatePath('/', 'layout');
    return { ok: true, message: 'นำคูปองออกแล้ว' };
  }
  await writeCoupon(code);
  revalidatePath('/', 'layout');
  // ผลลัพธ์จริง (ใช้ได้/ไม่ได้) หน้า cart คำนวณจาก quote แล้วแสดงเอง
  return { ok: true };
}

export async function removeCoupon(): Promise<void> {
  await writeCoupon(null);
  revalidatePath('/', 'layout');
  redirect('/cart');
}
