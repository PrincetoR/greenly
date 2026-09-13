'use server';

import { revalidatePath } from 'next/cache';
import { ensureGuestId } from '@/lib/guest';
import { toggleWishlistItem } from '@/lib/db/wishlists';
import { findProduct } from '@/lib/db/products';

export interface WishlistState {
  saved: boolean;
}

/** กดหัวใจ — สร้าง guest id ให้ถ้ายังไม่มี (เหมือนตะกร้า) */
export async function toggleWishlist(_prev: WishlistState, formData: FormData): Promise<WishlistState> {
  const productId = String(formData.get('productId') ?? '');
  if (!(await findProduct(productId))) return { saved: false };
  const guestId = await ensureGuestId();
  const saved = await toggleWishlistItem(guestId, productId);
  revalidatePath('/', 'layout');
  return { saved };
}
