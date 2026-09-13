import 'server-only';
import { readCart, readCoupon, type CartItem } from './storage';
import { findProductsByIds } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { quote } from '@/lib/pricing/quote';
import type { Quote, QuoteLineInput } from '@/lib/pricing/types';

export interface CartView {
  items: CartItem[];
  lines: QuoteLineInput[];
  quote: Quote;
  couponCode: string | null;
  /** สินค้าที่หายไป/ปิดขาย/หมด ระหว่างที่อยู่ในตะกร้า */
  removed: string[];
}

/**
 * ประกอบตะกร้าจาก storage (guest) + ราคาปัจจุบัน + โปรที่ live ณ ตอนนี้
 * ใช้ทั้งหน้า /cart /checkout และ placeOrder (ส่ง customerKey ให้ perCustomer มีผล)
 */
export async function loadCart(customerKey?: string | null): Promise<CartView> {
  const [items, ctx, couponCode] = await Promise.all([readCart(), loadPromotionContext(customerKey), readCoupon()]);
  const products = await findProductsByIds(items.map((i) => i.productId));
  const byId = new Map(products.map((p) => [p.id, p]));

  const removed: string[] = [];
  const lines: QuoteLineInput[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || !product.active || product.stock <= 0) {
      removed.push(product?.name ?? item.productId);
      continue;
    }
    lines.push({ product, qty: Math.min(item.qty, product.stock) });
  }

  const q = quote({ lines, promotions: ctx.promotions, usage: ctx.usage, settings: ctx.settings, couponCode, customerKey, now: ctx.now });
  return { items, lines, quote: q, couponCode, removed };
}
