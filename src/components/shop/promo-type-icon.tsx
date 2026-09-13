import { Gift, Tag, Ticket, type LucideProps } from 'lucide-react';
import type { PromotionType } from '@/lib/types';

const ICONS: Record<PromotionType, React.ComponentType<LucideProps>> = { discount: Tag, coupon: Ticket, bogo: Gift };

/** ไอคอนประจำประเภทโปร — ใช้ทั้งหน้าร้านและหลังบ้านให้จำง่ายเหมือนกัน */
export function PromoTypeIcon({ type, ...props }: LucideProps & { type: PromotionType }) {
  const Icon = ICONS[type];
  return <Icon aria-hidden {...props} />;
}
