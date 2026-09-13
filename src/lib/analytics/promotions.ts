import type { Order, Promotion } from '@/lib/types';
import { inRange, pctChange } from './periods';
import { liveOrders, totals, type Totals } from './sales';

/**
 * โปรโมชันกระตุ้นยอดขายได้ไหม — เทียบ "ยอดขายเฉลี่ยต่อวัน (ทุกออเดอร์) ระหว่างที่โปรเปิด" กับ "ช่วงก่อนเริ่มโปรที่ยาวเท่ากัน"
 * ตัวเลขนี้ไม่ได้ตัดปัจจัยอื่น (ฤดูกาล โปรซ้อน) ออก — เป็นสัญญาณให้ดูต่อ ไม่ใช่ข้อสรุป
 */
export interface PromotionImpact {
  promotion: Promotion;
  /** ออเดอร์ (ไม่ cancelled) ที่ใช้โปรนี้ ตลอดช่วงที่โปรเปิด */
  orders: number;
  /** ยอดขายของออเดอร์เหล่านั้น */
  revenue: number;
  /** ส่วนลดที่โปรนี้ให้ไป (ของแถมคิดเป็นมูลค่าเต็ม) */
  discount: number;
  /** วันที่โปรเปิดมาแล้ว (ถึงตอนนี้ถ้ายังไม่จบ) */
  days: number;
  perDayDuring: number;
  perDayBefore: number;
  uplift: number | null;
}

export interface PromotionReport {
  withPromo: Totals;
  withoutPromo: Totals;
  /** สัดส่วนออเดอร์ที่ใช้โปร 0–100 */
  share: number;
  items: PromotionImpact[];
}

const DAY = 86_400_000;

export const usesPromotion = (o: Order, id: string) => o.promotionUsages.some((u) => u.promotionId === id) || o.lines.some((l) => l.promotionId === id);
export const usesAnyPromotion = (o: Order) => o.promotionUsages.length > 0 || o.lines.some((l) => l.promotionId) || Boolean(o.couponCode);

/** ส่วนลดใน order นี้ที่มาจากโปร p — คูปองไม่มีบรรทัดของตัวเอง จึงเอา discountTotal ลบส่วนลดรายบรรทัดทั้งหมด */
export function discountFrom(o: Order, p: Promotion): number {
  const lineDiscount = o.lines.filter((l) => l.promotionId === p.id).reduce((s, l) => s + l.discount, 0);
  if (p.type === 'coupon' && p.coupon && o.couponCode === p.coupon.code) {
    const allLines = o.lines.reduce((s, l) => s + l.discount, 0);
    return lineDiscount + Math.max(0, o.discountTotal - allLines);
  }
  return lineDiscount;
}

export function promotionImpact(orders: Order[], p: Promotion, now: Date): PromotionImpact {
  const live = liveOrders(orders);
  const start = new Date(p.startsAt);
  const end = new Date(Math.min(new Date(p.endsAt).getTime(), now.getTime()));
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY));
  const before = new Date(start.getTime() - days * DAY);

  const during = live.filter((o) => inRange(o.createdAt, start, end));
  const used = during.filter((o) => usesPromotion(o, p.id));
  const perDayDuring = Math.round(totals(during).revenue / days);
  const perDayBefore = Math.round(totals(live.filter((o) => inRange(o.createdAt, before, start))).revenue / days);

  return {
    promotion: p,
    orders: used.length,
    revenue: used.reduce((s, o) => s + o.total, 0),
    discount: used.reduce((s, o) => s + discountFrom(o, p), 0),
    days,
    perDayDuring,
    perDayBefore,
    uplift: pctChange(perDayDuring, perDayBefore),
  };
}

/** โปรที่เริ่มแล้วและคาบเกี่ยวกับช่วง [start, end) · เรียงตามยอดขายที่เกิดจากโปร */
export function promotionReport(orders: Order[], promotions: Promotion[], now: Date, window: { start: Date; end: Date }): PromotionReport {
  const inWindow = liveOrders(orders).filter((o) => inRange(o.createdAt, window.start, window.end));
  const withPromo = totals(inWindow.filter(usesAnyPromotion));
  const withoutPromo = totals(inWindow.filter((o) => !usesAnyPromotion(o)));
  const items = promotions
    .filter((p) => new Date(p.startsAt) <= now && new Date(p.startsAt) < window.end && new Date(p.endsAt) > window.start)
    .map((p) => promotionImpact(orders, p, now))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
  return { withPromo, withoutPromo, share: inWindow.length ? (withPromo.orders / inWindow.length) * 100 : 0, items };
}
