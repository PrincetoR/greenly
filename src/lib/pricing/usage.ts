import type { Order, Promotion } from '@/lib/types';
import type { PromotionUsageStats } from './types';

/**
 * นับยอดใช้โปรจาก orders — แหล่งความจริงเดียว ไม่มี counter แยกให้เพี้ยน
 * order ที่ cancelled ไม่นับ → ยกเลิกแล้วสิทธิ์คืนเอง
 * customerKey = เบอร์โทร (normalize ตัดทุกอย่างที่ไม่ใช่ตัวเลข)
 */
export function normalizeCustomerKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 9 ? digits : null;
}

export function usageFromOrders(
  orders: Order[],
  promotions: Promotion[],
  customerKey?: string | null,
): Record<string, PromotionUsageStats> {
  const stats: Record<string, PromotionUsageStats> = {};
  for (const p of promotions) stats[p.id] = { totalUses: 0, perProduct: {}, byCustomer: 0 };

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const orderKey = normalizeCustomerKey(order.customer.phone);
    const seen = new Set<string>();
    for (const u of order.promotionUsages) {
      const s = stats[u.promotionId];
      if (!s) continue;
      if (!seen.has(u.promotionId)) {
        seen.add(u.promotionId);
        s.totalUses += 1;
        if (customerKey && orderKey === customerKey) s.byCustomer += 1;
      }
      if (u.productId) s.perProduct[u.productId] = (s.perProduct[u.productId] ?? 0) + u.qty;
    }
  }
  return stats;
}
