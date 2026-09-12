import 'server-only';
import { listOrders } from '@/lib/db/orders';
import { listPromotions } from '@/lib/db/promotions';
import { getSettings } from '@/lib/db/settings';
import { usageFromOrders } from '@/lib/pricing/usage';
import type { PromotionUsageStats } from '@/lib/pricing/types';
import type { Promotion, Settings } from '@/lib/types';

export interface PromotionContext {
  promotions: Promotion[];
  usage: Record<string, PromotionUsageStats>;
  settings: Settings;
  now: Date;
}

/**
 * ทุกอย่างที่ pricing engine ต้องใช้ โหลดครั้งเดียวต่อ request
 * customerKey ใส่เมื่อรู้เบอร์ลูกค้า (checkout) เพื่อให้ byCustomer ถูกนับ
 */
export async function loadPromotionContext(customerKey?: string | null): Promise<PromotionContext> {
  const [promotions, orders, settings] = await Promise.all([listPromotions(), listOrders(), getSettings()]);
  return { promotions, usage: usageFromOrders(orders, promotions, customerKey), settings, now: new Date() };
}
