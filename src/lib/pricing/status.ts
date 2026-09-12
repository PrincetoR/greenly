import type { Promotion } from '@/lib/types';
import type { PromotionUsageStats } from './types';

export type PromotionStatus = 'scheduled' | 'live' | 'ended' | 'exhausted' | 'inactive';

export const PROMOTION_STATUS_LABEL: Record<PromotionStatus, string> = {
  scheduled: 'ยังไม่เริ่ม',
  live: 'กำลังใช้งาน',
  ended: 'หมดเวลา',
  exhausted: 'ครบสิทธิ์แล้ว',
  inactive: 'ปิดใช้งาน',
};

/**
 * สถานะโปรตามเวลาและ quota — ใช้ทั้งหน้าร้าน (แสดง/ไม่แสดง) และหลังบ้าน (pill)
 * ลำดับสำคัญ: ปิด > หมดเวลา > ยังไม่เริ่ม > ครบสิทธิ์ > กำลังใช้งาน
 */
export function promotionStatus(promo: Promotion, now: Date, usage?: PromotionUsageStats): PromotionStatus {
  if (!promo.active) return 'inactive';
  const t = now.getTime();
  if (t >= new Date(promo.endsAt).getTime()) return 'ended';
  if (t < new Date(promo.startsAt).getTime()) return 'scheduled';
  if (promo.limits.totalUses !== null && usage && usage.totalUses >= promo.limits.totalUses) return 'exhausted';
  return 'live';
}

export function isLive(promo: Promotion, now: Date, usage?: PromotionUsageStats): boolean {
  return promotionStatus(promo, now, usage) === 'live';
}

export const EMPTY_USAGE: PromotionUsageStats = { totalUses: 0, perProduct: {}, byCustomer: 0 };
