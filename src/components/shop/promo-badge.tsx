import { Gift } from 'lucide-react';
import type { Promotion } from '@/lib/types';
import { shortDiscount } from '@/lib/promotions/describe';
import { Badge } from '@/components/ui/badge';

/** ป้ายเล็กบนการ์ดสินค้า: "-20%" / "ลด ฿100" / "ซื้อ 2 แถม 1" */
export function PromoBadge({ promotion }: { promotion: Promotion }) {
  const text = promotion.type === 'discount' && promotion.discount?.mode === 'percent' ? `-${promotion.discount.value}%` : shortDiscount(promotion);
  return (
    <Badge tone={promotion.type === 'bogo' ? 'brand' : 'accent'} className="shadow-sm">
      {promotion.type === 'bogo' && <Gift className="size-3" aria-hidden />}
      {text}
    </Badge>
  );
}
