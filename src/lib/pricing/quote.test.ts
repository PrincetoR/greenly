import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Order, Product, Promotion } from '@/lib/types';
import { quote, displayPrice } from './quote';
import { promotionStatus } from './status';
import { usageFromOrders } from './usage';

/* ---------- fixtures ---------- */
const NOW = new Date('2026-09-12T10:00:00Z');
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  sku: 'SKU',
  slug: 'p1',
  name: 'สินค้า A',
  description: '',
  categoryId: 'c1',
  price: 100_00,
  stock: 50,
  images: [],
  active: true,
  featured: false,
  createdAt: day(-1),
  updatedAt: day(-1),
  ...over,
});

const promo = (over: Partial<Promotion> = {}): Promotion => ({
  id: 'promo',
  name: 'โปร',
  type: 'discount',
  active: true,
  startsAt: day(-1),
  endsAt: day(1),
  scope: { kind: 'all', ids: [] },
  discount: { mode: 'percent', value: 20 },
  coupon: null,
  bogo: null,
  limits: { totalUses: null, perProductQty: null, perCustomer: null },
  createdAt: day(-1),
  updatedAt: day(-1),
  ...over,
});

const settings = { shippingFee: 50_00, freeShippingMin: 1000_00 };
const run = (over: Partial<Parameters<typeof quote>[0]> = {}) =>
  quote({ lines: [{ product: product(), qty: 1 }], promotions: [], usage: {}, settings, now: NOW, ...over });

/* ---------- status / เวลา ---------- */
describe('promotionStatus', () => {
  it('เรียงลำดับ: inactive > ended > scheduled > exhausted > live', () => {
    assert.equal(promotionStatus(promo({ active: false }), NOW), 'inactive');
    assert.equal(promotionStatus(promo({ startsAt: day(-5), endsAt: day(-1) }), NOW), 'ended');
    assert.equal(promotionStatus(promo({ startsAt: day(1), endsAt: day(5) }), NOW), 'scheduled');
    assert.equal(promotionStatus(promo({ limits: { totalUses: 2, perProductQty: null, perCustomer: null } }), NOW, { totalUses: 2, perProduct: {}, byCustomer: 0 }), 'exhausted');
    assert.equal(promotionStatus(promo(), NOW), 'live');
  });
  it('endsAt เป็นขอบไม่รวม — ถึงเวลาพอดีถือว่าหมดแล้ว', () => {
    assert.equal(promotionStatus(promo({ endsAt: NOW.toISOString() }), NOW), 'ended');
    assert.equal(promotionStatus(promo({ startsAt: NOW.toISOString() }), NOW), 'live');
  });
});

/* ---------- discount ---------- */
describe('discount', () => {
  it('ไม่มีโปร → ราคาเต็ม + ค่าส่ง', () => {
    const q = run({ lines: [{ product: product(), qty: 2 }] });
    assert.equal(q.subtotal, 200_00);
    assert.equal(q.discountTotal, 0);
    assert.equal(q.shippingFee, 50_00);
    assert.equal(q.total, 250_00);
  });
  it('ลด 20% ทั้งร้าน', () => {
    const q = run({ lines: [{ product: product(), qty: 3 }], promotions: [promo()] });
    assert.equal(q.discountTotal, 60_00);
    assert.equal(q.lines[0].discountedQty, 3);
    assert.deepEqual(q.usages, [{ promotionId: 'promo', productId: 'p1', qty: 3 }]);
  });
  it('ลดแบบบาท ไม่เกินราคาสินค้า', () => {
    const q = run({ lines: [{ product: product({ price: 80_00 }), qty: 1 }], promotions: [promo({ discount: { mode: 'fixed', value: 150_00 } })] });
    assert.equal(q.discountTotal, 80_00);
    assert.equal(q.total, 0 + 50_00);
  });
  it('percent ปัดสตางค์เป็นจำนวนเต็ม', () => {
    const q = run({ lines: [{ product: product({ price: 99_99 }), qty: 1 }], promotions: [promo({ discount: { mode: 'percent', value: 15 } })] });
    assert.equal(q.discountTotal, 1500); // 9999*0.15 = 1499.85 → 1500
    assert.ok(Number.isInteger(q.total));
  });
  it('scope หมวดหมู่ / สินค้า — ไม่ตรงไม่ลด', () => {
    const byCat = promo({ scope: { kind: 'categories', ids: ['c2'] } });
    const byProd = promo({ id: 'p-only', scope: { kind: 'products', ids: ['p1'] } });
    assert.equal(run({ promotions: [byCat] }).discountTotal, 0);
    assert.equal(run({ promotions: [byProd] }).discountTotal, 20_00);
  });
  it('หลายโปรชนกัน เลือกอันที่ลดมากสุดต่อสินค้า (ไม่ซ้อนกัน)', () => {
    const a = promo({ id: 'a', discount: { mode: 'percent', value: 10 } });
    const b = promo({ id: 'b', discount: { mode: 'fixed', value: 30_00 } });
    const q = run({ lines: [{ product: product(), qty: 2 }], promotions: [a, b] });
    assert.equal(q.discountTotal, 60_00);
    assert.equal(q.lines[0].promotionId, 'b');
    assert.equal(q.applied.length, 1);
  });
  it('นอกช่วงเวลา / ปิดใช้งาน → ไม่ลด', () => {
    assert.equal(run({ promotions: [promo({ startsAt: day(1), endsAt: day(2) })] }).discountTotal, 0);
    assert.equal(run({ promotions: [promo({ startsAt: day(-2), endsAt: day(-1) })] }).discountTotal, 0);
    assert.equal(run({ promotions: [promo({ active: false })] }).discountTotal, 0);
  });
});

/* ---------- limits ---------- */
describe('limits', () => {
  it('perProductQty: ลดแค่ N ชิ้น ที่เหลือราคาเต็ม + เตือน', () => {
    const p = promo({ limits: { totalUses: null, perProductQty: 5, perCustomer: null } });
    const q = run({ lines: [{ product: product(), qty: 7 }], promotions: [p] });
    assert.equal(q.lines[0].discountedQty, 5);
    assert.equal(q.discountTotal, 100_00);
    assert.equal(q.usages[0].qty, 5);
    assert.match(q.warnings[0], /ใช้ได้อีก 5 ชิ้น/);
  });
  it('perProductQty หักยอดที่ใช้ไปแล้วจาก orders', () => {
    const p = promo({ limits: { totalUses: null, perProductQty: 5, perCustomer: null } });
    const q = run({ lines: [{ product: product(), qty: 7 }], promotions: [p], usage: { promo: { totalUses: 1, perProduct: { p1: 4 }, byCustomer: 0 } } });
    assert.equal(q.lines[0].discountedQty, 1);
  });
  it('totalUses ครบ → โปรไม่ทำงาน', () => {
    const p = promo({ limits: { totalUses: 3, perProductQty: null, perCustomer: null } });
    assert.equal(run({ promotions: [p], usage: { promo: { totalUses: 3, perProduct: {}, byCustomer: 0 } } }).discountTotal, 0);
    assert.equal(run({ promotions: [p], usage: { promo: { totalUses: 2, perProduct: {}, byCustomer: 0 } } }).discountTotal, 20_00);
  });
  it('perCustomer: ตะกร้า (ไม่รู้เบอร์) ยังลด · checkout (รู้เบอร์ที่ใช้ครบแล้ว) ไม่ลด', () => {
    const p = promo({ limits: { totalUses: null, perProductQty: null, perCustomer: 1 } });
    const used = { promo: { totalUses: 1, perProduct: {}, byCustomer: 1 } };
    assert.equal(run({ promotions: [p], usage: used }).discountTotal, 20_00);
    assert.equal(run({ promotions: [p], usage: used, customerKey: '0812345678' }).discountTotal, 0);
    assert.equal(run({ promotions: [p], usage: { promo: { totalUses: 1, perProduct: {}, byCustomer: 0 } }, customerKey: '0812345678' }).discountTotal, 20_00);
  });
});

/* ---------- bogo ---------- */
describe('bogo', () => {
  const b2g1 = promo({ id: 'bogo', type: 'bogo', discount: null, bogo: { buyQty: 2, getQty: 1 } });
  it('ซื้อ 2 แถม 1 → เพิ่มบรรทัดของแถมราคา 0', () => {
    const q = run({ lines: [{ product: product(), qty: 4 }], promotions: [b2g1] });
    const gift = q.lines.find((l) => l.isGift)!;
    assert.equal(gift.qty, 2);
    assert.equal(gift.total, 0);
    assert.equal(q.subtotal, 600_00); // รวมมูลค่าของแถม 2 ชิ้น
    assert.equal(q.discountTotal, 200_00);
    assert.equal(q.total, 450_00); // payable 400 + ค่าส่ง 50

    assert.deepEqual(q.usages, [{ promotionId: 'bogo', productId: 'p1', qty: 2 }]);
  });
  it('ซื้อไม่ครบ → ไม่แถม แต่บอกว่าซื้ออีกกี่ชิ้น', () => {
    const q = run({ lines: [{ product: product(), qty: 1 }], promotions: [b2g1] });
    assert.equal(q.lines.length, 1);
    assert.match(q.warnings[0], /อีก 1 ชิ้น/);
  });
  it('ของแถมไม่เกิน stock ที่เหลือ', () => {
    const q = run({ lines: [{ product: product({ stock: 5 }), qty: 4 }], promotions: [b2g1] });
    assert.equal(q.lines.find((l) => l.isGift)!.qty, 1);
    assert.match(q.warnings[0], /ตามสต็อก/);
  });
  it('bogo + discount ใช้ร่วมกันได้ (ลดของที่ซื้อ + แถม)', () => {
    const q = run({ lines: [{ product: product(), qty: 2 }], promotions: [b2g1, promo()] });
    assert.equal(q.lines[0].discount, 40_00);
    assert.equal(q.lines[1].isGift, true);
    assert.equal(q.total, 200_00 - 40_00 - 0 + 50_00);
  });
  it('perCustomer ของ bogo: เบอร์เดิมที่รับแถมแล้ว ไม่ได้อีก', () => {
    const p = { ...b2g1, limits: { totalUses: null, perProductQty: null, perCustomer: 1 } };
    const q = run({ lines: [{ product: product(), qty: 2 }], promotions: [p], usage: { bogo: { totalUses: 1, perProduct: { p1: 1 }, byCustomer: 1 } }, customerKey: '0899999999' });
    assert.equal(q.lines.some((l) => l.isGift), false);
  });
});

/* ---------- coupon ---------- */
describe('coupon', () => {
  const save100 = promo({
    id: 'cp',
    type: 'coupon',
    discount: { mode: 'fixed', value: 100_00 },
    coupon: { code: 'SAVE100', minSubtotal: 500_00, freeShipping: false },
    limits: { totalUses: 50, perProductQty: null, perCustomer: 1 },
  });
  it('ใช้ได้ → ลดจากยอดหลังส่วนลดสินค้า', () => {
    const q = run({ lines: [{ product: product(), qty: 6 }], promotions: [save100], couponCode: 'save100' });
    assert.equal(q.coupon?.status, 'applied');
    assert.equal(q.discountTotal, 100_00);
    assert.equal(q.total, 600_00 - 100_00 + 50_00);
    assert.deepEqual(q.usages, [{ promotionId: 'cp', productId: null, qty: 1 }]);
  });
  it('ยอดไม่ถึงขั้นต่ำ → บอกว่าขาดอีกเท่าไร', () => {
    const q = run({ lines: [{ product: product(), qty: 3 }], promotions: [save100], couponCode: 'SAVE100' });
    assert.equal(q.coupon?.status, 'min-subtotal');
    assert.match(q.coupon!.message, /ขาดอีก ฿200/);
    assert.equal(q.discountTotal, 0);
  });
  it('ขั้นต่ำคิดจากยอดหลังลดสินค้าแล้ว', () => {
    // 6 ชิ้น 600 → ลด 20% เหลือ 480 < 500
    const q = run({ lines: [{ product: product(), qty: 6 }], promotions: [save100, promo()], couponCode: 'SAVE100' });
    assert.equal(q.coupon?.status, 'min-subtotal');
  });
  it('ไม่พบ / หมดอายุ / ครบสิทธิ์ / ใช้ต่อคนครบ', () => {
    const lines = [{ product: product(), qty: 6 }];
    assert.equal(run({ lines, promotions: [save100], couponCode: 'NOPE' }).coupon?.status, 'invalid');
    assert.equal(run({ lines, promotions: [{ ...save100, endsAt: day(-1) }], couponCode: 'SAVE100' }).coupon?.status, 'expired');
    assert.equal(run({ lines, promotions: [save100], usage: { cp: { totalUses: 50, perProduct: {}, byCustomer: 0 } }, couponCode: 'SAVE100' }).coupon?.status, 'exhausted');
    assert.equal(run({ lines, promotions: [save100], usage: { cp: { totalUses: 1, perProduct: {}, byCustomer: 1 } }, couponCode: 'SAVE100', customerKey: '0811111111' }).coupon?.status, 'per-customer');
  });
  it('คูปองส่งฟรีอย่างเดียว', () => {
    const ship = promo({ id: 'ship', type: 'coupon', discount: null, coupon: { code: 'FREESHIP', minSubtotal: null, freeShipping: true } });
    const q = run({ promotions: [ship], couponCode: 'FREESHIP' });
    assert.equal(q.shippingFee, 0);
    assert.equal(q.discountTotal, 0);
    assert.equal(q.coupon?.message, 'ส่งฟรี');
  });
  it('คูปอง percent เฉพาะหมวด คิดจากบรรทัดที่ตรง scope เท่านั้น', () => {
    const cp = promo({ id: 'cat', type: 'coupon', discount: { mode: 'percent', value: 50 }, coupon: { code: 'HALF', minSubtotal: null, freeShipping: false }, scope: { kind: 'categories', ids: ['c1'] } });
    const q = run({ lines: [{ product: product(), qty: 1 }, { product: product({ id: 'p2', categoryId: 'c9', price: 300_00 }), qty: 1 }], promotions: [cp], couponCode: 'HALF' });
    assert.equal(q.discountTotal, 50_00);
  });
});

/* ---------- shipping ---------- */
describe('shipping', () => {
  it('ยอดหลังหักส่วนลดถึงขั้นต่ำ → ส่งฟรี', () => {
    assert.equal(run({ lines: [{ product: product(), qty: 10 }] }).shippingFee, 0);
    // 10 ชิ้น 1000 ลด 20% เหลือ 800 → ไม่ถึง 1000 → คิดค่าส่ง
    assert.equal(run({ lines: [{ product: product(), qty: 10 }], promotions: [promo()] }).shippingFee, 50_00);
  });
  it('ตะกร้าว่าง → ไม่มีค่าส่ง', () => {
    assert.equal(run({ lines: [] }).total, 0);
  });
});

/* ---------- usageFromOrders ---------- */
describe('usageFromOrders', () => {
  const order = (over: Partial<Order>): Order => ({
    id: 'o',
    orderNo: 'OD',
    status: 'paid',
    guestIds: [],
    customer: { name: 'ก', phone: '081-234-5678', email: '', address: '' },
    lines: [],
    subtotal: 0,
    discountTotal: 0,
    shippingFee: 0,
    total: 0,
    couponCode: null,
    promotionUsages: [{ promotionId: 'promo', productId: 'p1', qty: 3 }],
    paymentMethod: 'cod',
    payment: null,
    shipment: null,
    history: [],
    note: '',
    createdAt: day(-1),
    updatedAt: day(-1),
    ...over,
  });
  it('นับ order ละ 1 สิทธิ์ · ชิ้นต่อสินค้ารวมกัน · ข้าม cancelled · แยกลูกค้าจากเบอร์ที่ normalize แล้ว', () => {
    const orders = [
      order({ id: 'a' }),
      order({ id: 'b', promotionUsages: [{ promotionId: 'promo', productId: 'p1', qty: 2 }, { promotionId: 'promo', productId: 'p2', qty: 1 }] }),
      order({ id: 'c', status: 'cancelled' }),
      order({ id: 'd', customer: { name: 'ข', phone: '0899999999', email: '', address: '' } }),
    ];
    const u = usageFromOrders(orders, [promo()], '0812345678');
    assert.equal(u.promo.totalUses, 3);
    assert.equal(u.promo.perProduct.p1, 8);
    assert.equal(u.promo.perProduct.p2, 1);
    assert.equal(u.promo.byCustomer, 2);
  });
});

/* ---------- displayPrice ---------- */
describe('displayPrice', () => {
  it('คืนราคาโปรของ 1 ชิ้น + โปรที่ใช้ + bogo ที่เข้าเงื่อนไข', () => {
    const b = promo({ id: 'bogo', type: 'bogo', discount: null, bogo: { buyQty: 2, getQty: 1 } });
    const d = displayPrice(product(), [promo(), b], {}, NOW);
    assert.equal(d.price, 80_00);
    assert.equal(d.original, 100_00);
    assert.equal(d.promotion?.id, 'promo');
    assert.equal(d.bogo?.id, 'bogo');
  });
});
