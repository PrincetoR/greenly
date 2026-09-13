import type { Category, Order, Product } from '@/lib/types';
import { inRange, pctChange } from './periods';
import { liveOrders } from './sales';

/**
 * หมวดไหนขายดี/ไม่ดี + สินค้าขายดี — นับจากบรรทัดสินค้าใน orders ที่ไม่ cancelled
 * รายได้ต่อบรรทัด = ราคาเต็ม × จำนวน − ส่วนลด (ของแถมจึงเป็น 0 และไม่นับเป็นชิ้นที่ขาย)
 */
export interface CategoryStat {
  category: Category;
  revenue: number;
  qty: number;
  orders: number;
  /** สัดส่วนของรายได้รวมในช่วง 0–100 */
  share: number;
  previousRevenue: number;
  change: number | null;
}

export interface ProductStat {
  productId: string;
  name: string;
  image: string | null;
  qty: number;
  revenue: number;
}

const lineRevenue = (l: Order['lines'][number]) => (l.isGift ? 0 : l.unitPrice * l.qty - l.discount);

export function categoryReport(
  orders: Order[],
  products: Product[],
  categories: Category[],
  window: { start: Date; end: Date },
  previousWindow: { start: Date; end: Date },
): CategoryStat[] {
  const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const live = liveOrders(orders);
  const sum = (w: { start: Date; end: Date }) => {
    const acc = new Map<string, { revenue: number; qty: number; orders: Set<string> }>();
    for (const o of live) {
      if (!inRange(o.createdAt, w.start, w.end)) continue;
      for (const l of o.lines) {
        if (l.isGift) continue;
        const cid = catOf.get(l.productId);
        if (!cid) continue;
        const a = acc.get(cid) ?? { revenue: 0, qty: 0, orders: new Set<string>() };
        a.revenue += lineRevenue(l);
        a.qty += l.qty;
        a.orders.add(o.id);
        acc.set(cid, a);
      }
    }
    return acc;
  };
  const cur = sum(window);
  const prev = sum(previousWindow);
  const total = [...cur.values()].reduce((s, a) => s + a.revenue, 0);

  return categories
    .map((category) => {
      const a = cur.get(category.id);
      const revenue = a?.revenue ?? 0;
      const previousRevenue = prev.get(category.id)?.revenue ?? 0;
      return { category, revenue, qty: a?.qty ?? 0, orders: a?.orders.size ?? 0, share: total ? (revenue / total) * 100 : 0, previousRevenue, change: pctChange(revenue, previousRevenue) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function topProducts(orders: Order[], window: { start: Date; end: Date }, limit = 5): ProductStat[] {
  const acc = new Map<string, ProductStat>();
  for (const o of liveOrders(orders)) {
    if (!inRange(o.createdAt, window.start, window.end)) continue;
    for (const l of o.lines) {
      if (l.isGift) continue;
      const a = acc.get(l.productId) ?? { productId: l.productId, name: l.name, image: l.image, qty: 0, revenue: 0 };
      a.qty += l.qty;
      a.revenue += lineRevenue(l);
      acc.set(l.productId, a);
    }
  }
  return [...acc.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}
