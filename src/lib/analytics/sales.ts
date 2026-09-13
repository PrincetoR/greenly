import type { Order } from '@/lib/types';
import { BUCKETS, inRange, pctChange, periods, type Period, type Range } from './periods';

/**
 * ยอดขายรายวัน/เดือน/ปี — นับจาก orders ที่ไม่ cancelled (นิยามเดียวกับ KPI "ยอดขายวันนี้")
 * ยอดขาย = order.total (หลังหักส่วนลด รวมค่าส่ง) · ส่วนลด = order.discountTotal
 */
export interface Totals {
  revenue: number;
  orders: number;
  discount: number;
  /** ยอดเฉลี่ยต่อออเดอร์ · 0 เมื่อไม่มีออเดอร์ */
  aov: number;
}

export interface SalesPoint extends Period {
  revenue: number;
  orders: number;
  discount: number;
}

export interface SalesReport {
  range: Range;
  points: SalesPoint[];
  current: Totals;
  previous: Totals;
  change: { revenue: number | null; orders: number | null; aov: number | null };
  /** ช่วงที่กราฟครอบคลุม [start, end) — การ์ดอื่นใช้ช่วงเดียวกัน */
  window: { start: Date; end: Date };
  previousWindow: { start: Date; end: Date };
}

export const liveOrders = (orders: Order[]) => orders.filter((o) => o.status !== 'cancelled');

export function totals(orders: Order[]): Totals {
  const live = liveOrders(orders);
  const revenue = live.reduce((s, o) => s + o.total, 0);
  return { revenue, orders: live.length, discount: live.reduce((s, o) => s + o.discountTotal, 0), aov: live.length ? Math.round(revenue / live.length) : 0 };
}

export function salesReport(orders: Order[], range: Range, now: Date): SalesReport {
  const count = BUCKETS[range];
  const cur = periods(range, now, count);
  const prev = periods(range, now, count, count);
  const window = { start: cur[0].start, end: cur[cur.length - 1].end };
  const previousWindow = { start: prev[0].start, end: prev[prev.length - 1].end };
  const live = liveOrders(orders);

  const points: SalesPoint[] = cur.map((p) => {
    const t = totals(live.filter((o) => inRange(o.createdAt, p.start, p.end)));
    return { ...p, revenue: t.revenue, orders: t.orders, discount: t.discount };
  });
  const current = totals(live.filter((o) => inRange(o.createdAt, window.start, window.end)));
  const previous = totals(live.filter((o) => inRange(o.createdAt, previousWindow.start, previousWindow.end)));

  return {
    range,
    points,
    current,
    previous,
    change: { revenue: pctChange(current.revenue, previous.revenue), orders: pctChange(current.orders, previous.orders), aov: pctChange(current.aov, previous.aov) },
    window,
    previousWindow,
  };
}
