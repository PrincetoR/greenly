import type { Promotion } from '@/lib/types';
import { formatBaht } from '@/lib/money';
import { formatRange } from '@/lib/datetime';

export const PROMOTION_TYPE_LABEL: Record<Promotion['type'], string> = {
  discount: 'ลดราคา',
  coupon: 'คูปองโค้ด',
  bogo: 'ซื้อแถม',
};

export const PROMOTION_TYPE_ICON: Record<Promotion['type'], string> = {
  discount: '🏷️',
  coupon: '🎟️',
  bogo: '🎁',
};

type PromoLike = Pick<Promotion, 'type' | 'scope' | 'discount' | 'coupon' | 'bogo' | 'limits' | 'startsAt' | 'endsAt'>;

/** "ลด 20%" / "ลด ฿100" / "ซื้อ 2 แถม 1" — ใช้บนป้ายที่มีที่น้อย */
export function shortDiscount(promo: Pick<Promotion, 'type' | 'discount' | 'coupon' | 'bogo'>): string {
  if (promo.type === 'bogo' && promo.bogo) return `ซื้อ ${promo.bogo.buyQty} แถม ${promo.bogo.getQty}`;
  if (promo.discount) return promo.discount.mode === 'percent' ? `ลด ${promo.discount.value}%` : `ลด ${formatBaht(promo.discount.value)}`;
  if (promo.coupon?.freeShipping) return 'ส่งฟรี';
  return 'โปรโมชัน';
}

/**
 * ประโยคสรุปโปรโมชันภาษาคน — ใช้ทั้งแถบสรุปในฟอร์มและหน้ารายการ
 * เช่น "ลด 20% สินค้าในหมวด เครื่องดื่มสุขภาพ · 11 ก.ย. – 26 ก.ย. 69 · จำกัด 5 ชิ้น/สินค้า"
 */
export function describePromotion(promo: PromoLike, names: { categories: Map<string, string>; products: Map<string, string> }): string {
  const parts: string[] = [];
  const scope = describeScope(promo.scope, names);

  if (promo.type === 'discount') parts.push(`${shortDiscount(promo)} ${scope}`);
  if (promo.type === 'bogo' && promo.bogo) parts.push(`ซื้อ ${promo.bogo.buyQty} แถม ${promo.bogo.getQty} ${scope}`);
  if (promo.type === 'coupon' && promo.coupon) {
    const what = [promo.discount ? shortDiscount({ ...promo, coupon: null }) : null, promo.coupon.freeShipping ? 'ส่งฟรี' : null].filter(Boolean).join(' + ') || 'คูปอง';
    parts.push(`โค้ด ${promo.coupon.code || '…'} ${what} ${scope}${promo.coupon.minSubtotal ? ` เมื่อซื้อครบ ${formatBaht(promo.coupon.minSubtotal)}` : ''}`);
  }

  const start = new Date(promo.startsAt).getTime();
  const end = new Date(promo.endsAt).getTime();
  if (Number.isFinite(start) && Number.isFinite(end)) parts.push(formatRange(promo.startsAt, promo.endsAt));

  const limits: string[] = [];
  if (promo.limits.totalUses !== null) limits.push(`${promo.limits.totalUses} สิทธิ์`);
  if (promo.limits.perProductQty !== null) limits.push(`${promo.limits.perProductQty} ชิ้น/สินค้า`);
  if (promo.limits.perCustomer !== null) limits.push(`${promo.limits.perCustomer} ครั้ง/ลูกค้า`);
  parts.push(limits.length ? `จำกัด ${limits.join(', ')}` : 'ไม่จำกัดจำนวน');

  return parts.join(' · ');
}

function describeScope(scope: Promotion['scope'], names: { categories: Map<string, string>; products: Map<string, string> }): string {
  if (scope.kind === 'all') return 'สินค้าทั้งร้าน';
  const map = scope.kind === 'categories' ? names.categories : names.products;
  const labels = scope.ids.map((id) => map.get(id) ?? '?');
  const head = scope.kind === 'categories' ? 'สินค้าในหมวด' : 'สินค้า';
  if (labels.length === 0) return `${head} (ยังไม่ได้เลือก)`;
  if (labels.length <= 2) return `${head} ${labels.join(', ')}`;
  return `${head} ${labels.slice(0, 2).join(', ')} และอีก ${labels.length - 2} รายการ`;
}
