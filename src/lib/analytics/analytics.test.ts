import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Category, Order, Product, Promotion } from '@/lib/types';
import { bangkokStart, bangkokYmd, pctChange, periods } from './periods';
import { salesReport } from './sales';
import { discountFrom, promotionImpact, promotionReport } from './promotions';
import { categoryReport, topProducts } from './categories';

/* ---------- fixtures ---------- */
// 14 ก.ย. 2026 12:00 เวลาไทย = 05:00Z
const NOW = new Date('2026-09-14T05:00:00Z');
const day = (n: number, hour = 12) => new Date(Date.UTC(2026, 8, 14 + n, hour - 7)).toISOString();

const order = (over: Partial<Order> & { total?: number }): Order => ({
  id: over.id ?? `o-${Math.random().toString(36).slice(2, 8)}`,
  orderNo: 'OD-1',
  status: 'done',
  guestIds: [],
  customer: { name: 'ก', phone: '0800000000', email: '', address: '' },
  lines: [{ productId: 'p1', name: 'A', image: null, unitPrice: 100_00, qty: 1, discount: 0, promotionId: null, isGift: false }],
  subtotal: 100_00,
  discountTotal: 0,
  shippingFee: 0,
  total: 100_00,
  couponCode: null,
  promotionUsages: [],
  paymentMethod: 'beam',
  payment: null,
  shipment: null,
  history: [],
  note: '',
  createdAt: day(0),
  updatedAt: day(0),
  ...over,
});

const promo = (over: Partial<Promotion> = {}): Promotion => ({
  id: 'promo',
  name: 'โปร',
  type: 'discount',
  active: true,
  startsAt: day(-5),
  endsAt: day(5),
  scope: { kind: 'all', ids: [] },
  discount: { mode: 'percent', value: 20 },
  coupon: null,
  bogo: null,
  limits: { totalUses: null, perProductQty: null, perCustomer: null },
  createdAt: day(-10),
  updatedAt: day(-10),
  ...over,
});

const products: Product[] = [
  { id: 'p1', sku: 'A', slug: 'a', name: 'A', description: '', categoryId: 'c1', price: 100_00, stock: 9, images: [], active: true, featured: false, createdAt: day(-30), updatedAt: day(-30) },
  { id: 'p2', sku: 'B', slug: 'b', name: 'B', description: '', categoryId: 'c2', price: 50_00, stock: 9, images: [], active: true, featured: false, createdAt: day(-30), updatedAt: day(-30) },
];
const categories: Category[] = [
  { id: 'c1', slug: 'c1', name: 'หมวด 1', sortOrder: 10, active: true },
  { id: 'c2', slug: 'c2', name: 'หมวด 2', sortOrder: 20, active: true },
];

/* ---------- periods ---------- */
describe('periods', () => {
  it('นับวันตามเวลาไทย — 23:30Z ของวันก่อน คือวันนี้ของไทย', () => {
    assert.deepEqual(bangkokYmd(new Date('2026-09-13T23:30:00Z')), { y: 2026, m: 9, d: 14 });
    assert.equal(bangkokStart(2026, 9, 14).toISOString(), '2026-09-13T17:00:00.000Z');
  });
  it('รายวัน 30 ช่อง ช่องสุดท้ายคือวันนี้ ต่อเนื่องไม่มีรู', () => {
    const p = periods('day', NOW);
    assert.equal(p.length, 30);
    assert.equal(p[29].key, '2026-09-14');
    assert.equal(p[29].label, '14 ก.ย.');
    assert.equal(p[0].key, '2026-08-16');
    for (let i = 1; i < p.length; i++) assert.equal(p[i].start.getTime(), p[i - 1].end.getTime());
  });
  it('รายเดือนข้ามปี + offset ให้ช่วงก่อนหน้าที่ต่อกันพอดี', () => {
    const cur = periods('month', NOW);
    const prev = periods('month', NOW, 12, 12);
    assert.equal(cur[0].key, '2025-10');
    assert.equal(cur[11].key, '2026-09');
    assert.equal(cur[11].label, 'ก.ย. 69');
    assert.equal(prev[11].end.getTime(), cur[0].start.getTime());
    assert.equal(prev[0].key, '2024-10');
  });
  it('รายปีเป็น พ.ศ.', () => {
    const p = periods('year', NOW);
    assert.deepEqual(p.map((x) => x.label), ['2565', '2566', '2567', '2568', '2569']);
  });
  it('pctChange คืน null เมื่อฐานเป็น 0', () => {
    assert.equal(pctChange(10, 0), null);
    assert.equal(pctChange(150, 100), 50);
  });
});

/* ---------- sales ---------- */
describe('salesReport', () => {
  const orders = [
    order({ createdAt: day(0), total: 100_00 }),
    order({ createdAt: day(-1), total: 200_00 }),
    order({ createdAt: day(-1), total: 50_00, status: 'cancelled' }),
    order({ createdAt: day(-40), total: 300_00 }), // ช่วงก่อนหน้า
    order({ createdAt: day(-100), total: 999_00 }), // นอกทั้งสองช่วง
  ];
  it('รวมยอดต่อช่อง ไม่นับ cancelled และเติมช่องว่างเป็น 0', () => {
    const r = salesReport(orders, 'day', NOW);
    assert.equal(r.points.length, 30);
    assert.equal(r.points[29].revenue, 100_00);
    assert.equal(r.points[28].revenue, 200_00);
    assert.equal(r.points[28].orders, 1);
    assert.equal(r.points[0].revenue, 0);
  });
  it('สรุปช่วงนี้ vs ช่วงก่อนหน้า', () => {
    const r = salesReport(orders, 'day', NOW);
    assert.equal(r.current.revenue, 300_00);
    assert.equal(r.current.orders, 2);
    assert.equal(r.current.aov, 150_00);
    assert.equal(r.previous.revenue, 300_00);
    assert.equal(r.change.revenue, 0);
    assert.equal(r.change.orders, 100);
  });
  it('รายปี: ออเดอร์ทุกตัวอยู่ในปีนี้', () => {
    const r = salesReport(orders, 'year', NOW);
    assert.equal(r.points[4].revenue, 1599_00);
    assert.equal(r.change.revenue, null);
  });
});

/* ---------- promotions ---------- */
describe('promotionImpact', () => {
  const p = promo({ startsAt: day(-4), endsAt: day(6) }); // เปิดมา 4 วัน (ถึง now)
  const usedLine = { productId: 'p1', name: 'A', image: null, unitPrice: 100_00, qty: 1, discount: 20_00, promotionId: 'promo', isGift: false };
  const orders = [
    // ระหว่างโปร: 2 ออเดอร์ใช้โปร + 1 ไม่ใช้
    order({ createdAt: day(-3), lines: [usedLine], discountTotal: 20_00, total: 80_00, promotionUsages: [{ promotionId: 'promo', productId: 'p1', qty: 1 }] }),
    order({ createdAt: day(-1), lines: [usedLine], discountTotal: 20_00, total: 80_00, promotionUsages: [{ promotionId: 'promo', productId: 'p1', qty: 1 }] }),
    order({ createdAt: day(-2), total: 100_00 }),
    // ก่อนโปร 4 วัน: 1 ออเดอร์
    order({ createdAt: day(-6), total: 100_00 }),
    // cancelled ไม่นับ
    order({ createdAt: day(-1), status: 'cancelled', lines: [usedLine], total: 80_00, promotionUsages: [{ promotionId: 'promo', productId: 'p1', qty: 1 }] }),
  ];
  it('นับออเดอร์/ยอด/ส่วนลดเฉพาะที่ใช้โปร และเทียบยอดต่อวันกับช่วงก่อนเริ่ม', () => {
    const r = promotionImpact(orders, p, NOW);
    assert.equal(r.days, 4);
    assert.equal(r.orders, 2);
    assert.equal(r.revenue, 160_00);
    assert.equal(r.discount, 40_00);
    assert.equal(r.perDayDuring, Math.round(260_00 / 4));
    assert.equal(r.perDayBefore, Math.round(100_00 / 4));
    assert.equal(r.uplift, 160);
  });
  it('คูปอง: ส่วนลด = discountTotal − ส่วนลดรายบรรทัด', () => {
    const c = promo({ id: 'cp', type: 'coupon', coupon: { code: 'SAVE', minSubtotal: null, freeShipping: false }, discount: { mode: 'fixed', value: 30_00 } });
    const o = order({ lines: [usedLine], discountTotal: 50_00, couponCode: 'SAVE', total: 50_00, promotionUsages: [{ promotionId: 'cp', productId: null, qty: 1 }] });
    assert.equal(discountFrom(o, c), 30_00);
    assert.equal(discountFrom(o, p), 20_00);
  });
  it('promotionReport: สัดส่วนออเดอร์ที่ใช้โปร + เรียงตามยอด + ตัดโปรที่ยังไม่เริ่ม', () => {
    const future = promo({ id: 'future', startsAt: day(2), endsAt: day(9) });
    const r = promotionReport(orders, [future, p], NOW, { start: new Date(day(-10)), end: NOW });
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0].promotion.id, 'promo');
    assert.equal(r.withPromo.orders, 2);
    assert.equal(r.withoutPromo.orders, 2);
    assert.equal(r.share, 50);
  });
});

/* ---------- categories ---------- */
describe('categoryReport / topProducts', () => {
  const w = { start: new Date(day(-7)), end: NOW };
  const pw = { start: new Date(day(-14)), end: new Date(day(-7)) };
  const orders = [
    order({ createdAt: day(-1), lines: [{ productId: 'p1', name: 'A', image: null, unitPrice: 100_00, qty: 2, discount: 20_00, promotionId: 'x', isGift: false }] }),
    order({ createdAt: day(-2), lines: [{ productId: 'p2', name: 'B', image: null, unitPrice: 50_00, qty: 1, discount: 0, promotionId: null, isGift: false }, { productId: 'p2', name: 'B', image: null, unitPrice: 50_00, qty: 1, discount: 50_00, promotionId: 'g', isGift: true }] }),
    order({ createdAt: day(-10), lines: [{ productId: 'p2', name: 'B', image: null, unitPrice: 50_00, qty: 4, discount: 0, promotionId: null, isGift: false }] }),
  ];
  it('รายได้สุทธิต่อหมวด ของแถมไม่นับ สัดส่วนรวม 100 เรียงมาก → น้อย', () => {
    const r = categoryReport(orders, products, categories, w, pw);
    assert.equal(r[0].category.id, 'c1');
    assert.equal(r[0].revenue, 180_00);
    assert.equal(r[0].qty, 2);
    assert.equal(r[1].revenue, 50_00);
    assert.equal(r[1].qty, 1);
    assert.equal(Math.round(r[0].share + r[1].share), 100);
    assert.equal(r[1].previousRevenue, 200_00);
    assert.equal(r[1].change, -75);
    assert.equal(r[0].change, null);
  });
  it('สินค้าขายดีเรียงตามจำนวนชิ้น', () => {
    const t = topProducts(orders, { start: new Date(day(-30)), end: NOW }, 5);
    assert.equal(t[0].productId, 'p2');
    assert.equal(t[0].qty, 5);
    assert.equal(t[1].qty, 2);
  });
});
