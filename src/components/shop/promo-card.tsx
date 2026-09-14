import type { Category, Product, Promotion } from '@/lib/types';
import { describePromotion, describePromotionParts, shortDiscount } from '@/lib/promotions/describe';
import { promotionStatus, type PromotionStatus } from '@/lib/pricing/status';
import type { PromotionUsageStats } from '@/lib/pricing/types';
import { clockCountdown } from '@/lib/datetime';
import { formatBaht } from '@/lib/money';
import { PromoCardView, type PromoCardData } from './promo-card-view';

/** ลิงก์ที่พาไปดูสินค้าในโปร — หมวดเดียวใช้หน้าหมวด นอกนั้นใช้หน้ารวมกรองด้วย promo */
export function promoHref(promo: Promotion, categories: Category[]): string {
  if (promo.scope.kind === 'categories' && promo.scope.ids.length === 1) {
    const c = categories.find((c) => c.id === promo.scope.ids[0]);
    if (c) return `/category/${c.slug}`;
  }
  return `/products?promo=${promo.id}`;
}

/**
 * การ์ดโปรโมชัน (server): เตรียมข้อมูลที่ต้องใช้ (ประโยคสรุป · สิทธิ์เหลือ · สินค้า/หมวดในโปร · เงื่อนไข) แล้วส่งให้ PromoCardView (client)
 * ซึ่งวาดการ์ดแบบย่อ (ชื่อ 1 บรรทัด · สถานะ · คำอธิบาย 2 บรรทัด = ทำอะไร / ช่วงเวลา+เงื่อนไข) และเปิดป๊อปอัปรายละเอียดเต็มเมื่อกด (พี่ต่อสั่ง)
 */
export function PromoCard({
  promo,
  status,
  usage,
  categories,
  products,
  now,
}: {
  promo: Promotion;
  status: PromotionStatus;
  usage?: PromotionUsageStats;
  categories: Category[];
  products: Product[];
  now: Date;
}) {
  const names = { categories: new Map(categories.map((c) => [c.id, c.name])), products: new Map(products.map((p) => [p.id, p.name])) };
  const left = promo.limits.totalUses !== null ? Math.max(0, promo.limits.totalUses - (usage?.totalUses ?? 0)) : null;
  const live = status === 'live';

  // สินค้า/หมวดที่โปรครอบคลุม (โชว์ในป๊อปอัป) — ทั้งร้านไม่ต้องลิสต์
  const scopeItems: PromoCardData['scopeItems'] =
    promo.scope.kind === 'products'
      ? promo.scope.ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p)).map((p) => ({ label: p.name, sub: formatBaht(p.price), href: `/product/${p.slug}` }))
      : promo.scope.kind === 'categories'
        ? promo.scope.ids.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => Boolean(c)).map((c) => ({ label: c.name, sub: `${products.filter((p) => p.categoryId === c.id && p.active).length} สินค้า`, href: `/category/${c.slug}` }))
        : [];

  const conditions: string[] = [];
  if (promo.coupon?.minSubtotal) conditions.push(`ยอดสั่งซื้อขั้นต่ำ ${formatBaht(promo.coupon.minSubtotal)}`);
  if (promo.coupon?.freeShipping) conditions.push('ส่งฟรี');
  if (promo.limits.totalUses !== null) conditions.push(`จำกัด ${promo.limits.totalUses.toLocaleString('th-TH')} สิทธิ์ทั้งโปร`);
  if (promo.limits.perProductQty !== null) conditions.push(`ลดได้สูงสุด ${promo.limits.perProductQty} ชิ้นต่อสินค้า`);
  if (promo.limits.perCustomer !== null) conditions.push(`ใช้ได้ ${promo.limits.perCustomer} ครั้งต่อลูกค้า (นับจากเบอร์โทร)`);

  const parts = describePromotionParts(promo, names);
  const data: PromoCardData = {
    id: promo.id,
    type: promo.type,
    name: promo.name,
    description: describePromotion(promo, names),
    summary: parts.what,
    terms: [parts.period, parts.limits].filter(Boolean).join(' · '),
    discount: shortDiscount(promo),
    live,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
    countdownInitial: live ? clockCountdown(promo.endsAt, now) : clockCountdown(promo.startsAt, now),
    left,
    couponCode: promo.coupon?.code ?? null,
    scopeKind: promo.scope.kind,
    scopeItems,
    conditions,
    href: promoHref(promo, categories),
  };
  return <PromoCardView data={data} />;
}

export { promotionStatus };
