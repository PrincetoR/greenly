import type { Product, Promotion, PromotionUsage } from '@/lib/types';
import { formatBaht, roundSatang } from '@/lib/money';
import { EMPTY_USAGE, isLive, promotionStatus } from './status';
import type { AppliedPromotion, PromotionUsageStats, Quote, QuoteInput, QuoteLine } from './types';

/**
 * Pricing engine — pure function ไม่แตะไฟล์/เวลาเครื่อง (รับ now เข้ามา)
 * ทั้งตะกร้า checkout และหน้าสินค้าใช้ตัวนี้ตัวเดียว ราคาจึงตรงกันทุกที่
 *
 * ลำดับการคิด:
 *   1. ส่วนลดต่อบรรทัด (discount) — เลือกโปรที่ลดได้มากสุดต่อสินค้า จำกัดชิ้นตาม perProductQty
 *   2. ของแถม (bogo) — เพิ่มบรรทัดราคา 0 จำกัดตาม limits และ stock ที่เหลือ
 *   3. คูปอง — ลดจากยอดหลังข้อ 1–2 หรือส่งฟรี
 *   4. ค่าส่ง — ฟรีเมื่อคูปองส่งฟรี หรือยอดถึงขั้นต่ำของร้าน
 */
export function quote(input: QuoteInput): Quote {
  const { now, settings } = input;
  const usageOf = (p: Promotion): PromotionUsageStats => input.usage[p.id] ?? EMPTY_USAGE;
  const customerKey = input.customerKey ?? null;

  const warnings: string[] = [];
  const usages: PromotionUsage[] = [];
  const applied = new Map<string, AppliedPromotion>();
  const addApplied = (p: Promotion, amount: number) => {
    const cur = applied.get(p.id);
    if (cur) cur.amount += amount;
    else applied.set(p.id, { promotionId: p.id, name: p.name, type: p.type, amount });
  };

  /** โปรนี้ลูกค้าคนนี้ใช้ครบสิทธิ์ต่อคนแล้วหรือยัง — ตะกร้าที่ยังไม่รู้เบอร์จะไม่ถูกบล็อก */
  const customerBlocked = (p: Promotion) =>
    p.limits.perCustomer !== null && customerKey !== null && usageOf(p).byCustomer >= p.limits.perCustomer;

  const live = input.promotions.filter((p) => isLive(p, now, usageOf(p)) && !customerBlocked(p));
  const discountPromos = live.filter((p) => p.type === 'discount' && p.discount);
  const bogoPromos = live.filter((p) => p.type === 'bogo' && p.bogo);

  /* ---------- 1. ส่วนลดต่อบรรทัด ---------- */
  const lines: QuoteLine[] = [];
  for (const { product, qty } of input.lines) {
    if (qty <= 0) continue;
    const unit = product.price;

    let best: { promo: Promotion; eligibleQty: number; amount: number } | null = null;
    for (const promo of discountPromos) {
      if (!matchesScope(promo, product)) continue;
      const perUnit = discountPerUnit(promo, unit);
      const eligibleQty = Math.min(qty, remainingPerProduct(promo, product.id, usageOf(promo)));
      if (eligibleQty <= 0 || perUnit <= 0) continue;
      const amount = perUnit * eligibleQty;
      if (!best || amount > best.amount) best = { promo, eligibleQty, amount };
    }

    if (best && best.eligibleQty < qty) {
      warnings.push(
        `"${best.promo.name}" ใช้ได้อีก ${best.eligibleQty} ชิ้นสำหรับ ${product.name} — ส่วนที่เหลือคิดราคาปกติ`,
      );
    }
    if (best) {
      usages.push({ promotionId: best.promo.id, productId: product.id, qty: best.eligibleQty });
      addApplied(best.promo, best.amount);
    }

    lines.push({
      productId: product.id,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: unit,
      qty,
      discount: best?.amount ?? 0,
      discountedQty: best?.eligibleQty ?? 0,
      promotionId: best?.promo.id ?? null,
      promotionName: best?.promo.name ?? null,
      isGift: false,
      total: unit * qty - (best?.amount ?? 0),
    });
  }

  /* ---------- 2. ของแถม ---------- */
  const gifts: QuoteLine[] = [];
  for (const { product, qty } of input.lines) {
    if (qty <= 0) continue;
    let best: { promo: Promotion; gifts: number; cappedByStock: boolean } | null = null;
    for (const promo of bogoPromos) {
      if (!matchesScope(promo, product)) continue;
      const { buyQty, getQty } = promo.bogo!;
      const sets = Math.floor(qty / buyQty);
      if (sets === 0) {
        warnings.push(`ซื้อ ${product.name} อีก ${buyQty - qty} ชิ้น รับฟรีเพิ่ม ${getQty} ชิ้น (${promo.name})`);
        continue;
      }
      let count = sets * getQty;
      count = Math.min(count, remainingPerProduct(promo, product.id, usageOf(promo)));
      const stockLeft = Math.max(0, product.stock - qty);
      const cappedByStock = count > stockLeft;
      count = Math.min(count, stockLeft);
      if (count <= 0) continue;
      if (!best || count > best.gifts) best = { promo, gifts: count, cappedByStock };
    }
    if (!best) continue;
    if (best.cappedByStock) warnings.push(`ของแถม ${product.name} ให้ได้ ${best.gifts} ชิ้นตามสต็อกที่เหลือ`);
    const value = product.price * best.gifts;
    usages.push({ promotionId: best.promo.id, productId: product.id, qty: best.gifts });
    addApplied(best.promo, value);
    gifts.push({
      productId: product.id,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: product.price,
      qty: best.gifts,
      discount: value,
      discountedQty: best.gifts,
      promotionId: best.promo.id,
      promotionName: best.promo.name,
      isGift: true,
      total: 0,
    });
  }
  lines.push(...gifts);

  // subtotal รวมมูลค่าของแถมด้วย (ราคาเต็ม) แล้วค่อยหักเป็นส่วนลด → ลูกค้าเห็นว่าได้ของมูลค่าเท่าไรฟรี
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemDiscount = lines.reduce((s, l) => s + l.discount, 0);
  const afterItems = subtotal - itemDiscount;

  /* ---------- 3. คูปอง ---------- */
  let coupon: Quote['coupon'] = null;
  let couponAmount = 0;
  let freeShippingByCoupon = false;
  const code = input.couponCode?.trim().toUpperCase();
  if (code) {
    const promo = input.promotions.find((p) => p.type === 'coupon' && p.coupon?.code.toUpperCase() === code);
    if (!promo) {
      coupon = { code, status: 'invalid', message: 'ไม่พบคูปองนี้' };
    } else {
      const status = promotionStatus(promo, now, usageOf(promo));
      const min = promo.coupon!.minSubtotal;
      if (status === 'exhausted') coupon = { code, status: 'exhausted', message: 'คูปองถูกใช้ครบจำนวนแล้ว' };
      else if (status !== 'live') coupon = { code, status: 'expired', message: 'คูปองหมดอายุหรือยังไม่ถึงเวลาใช้งาน' };
      else if (customerBlocked(promo)) coupon = { code, status: 'per-customer', message: 'คุณใช้คูปองนี้ครบจำนวนที่กำหนดแล้ว' };
      else if (min !== null && afterItems < min)
        coupon = { code, status: 'min-subtotal', message: `คูปองนี้ใช้เมื่อยอดสินค้าครบ ${formatBaht(min)} (ขาดอีก ${formatBaht(min - afterItems)})` };
      else {
        const base =
          promo.scope.kind === 'all'
            ? afterItems
            : lines.filter((l) => !l.isGift && matchesScope(promo, { id: l.productId, categoryId: productCategory(input, l.productId) })).reduce((s, l) => s + l.total, 0);
        couponAmount = promo.discount ? Math.min(discountPerUnit(promo, base), base) : 0;
        freeShippingByCoupon = promo.coupon!.freeShipping;
        usages.push({ promotionId: promo.id, productId: null, qty: 1 });
        addApplied(promo, couponAmount);
        coupon = { code, status: 'applied', message: freeShippingByCoupon && couponAmount === 0 ? 'ส่งฟรี' : `ลด ${formatBaht(couponAmount)}` };
      }
    }
  }

  /* ---------- 4. ค่าส่งและยอดรวม ---------- */
  const discountTotal = itemDiscount + couponAmount;
  const payable = subtotal - discountTotal;
  let shippingFee = 0;
  if (subtotal > 0) {
    if (freeShippingByCoupon) shippingFee = 0;
    else if (settings.freeShippingMin !== null && payable >= settings.freeShippingMin) shippingFee = 0;
    else shippingFee = settings.shippingFee;
  }

  return {
    lines,
    subtotal,
    discountTotal,
    shippingFee,
    total: payable + shippingFee,
    applied: [...applied.values()],
    warnings,
    coupon,
    usages,
  };
}

/* ---------- helpers ---------- */

export function matchesScope(promo: Promotion, product: Pick<Product, 'id' | 'categoryId'>): boolean {
  switch (promo.scope.kind) {
    case 'all':
      return true;
    case 'categories':
      return promo.scope.ids.includes(product.categoryId);
    case 'products':
      return promo.scope.ids.includes(product.id);
  }
}

/** ส่วนลดต่อหน่วย (หรือต่อยอด) — percent ปัดเป็นสตางค์เต็ม · fixed ไม่เกินราคา */
export function discountPerUnit(promo: Promotion, base: number): number {
  if (!promo.discount) return 0;
  const { mode, value } = promo.discount;
  return mode === 'percent' ? roundSatang((base * value) / 100) : Math.min(value, base);
}

function remainingPerProduct(promo: Promotion, productId: string, usage: PromotionUsageStats): number {
  const limit = promo.limits.perProductQty;
  if (limit === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - (usage.perProduct[productId] ?? 0));
}

function productCategory(input: QuoteInput, productId: string): string {
  return input.lines.find((l) => l.product.id === productId)?.product.categoryId ?? '';
}

/**
 * ราคาโปรของสินค้าชิ้นเดียวสำหรับแสดงบนการ์ด/หน้าสินค้า
 * = quote ของ qty 1 โดยไม่รู้ลูกค้า — ให้หน้าร้านใช้ตัวเดียวกับตะกร้า ไม่คิดแยก
 */
export function displayPrice(
  product: Product,
  promotions: Promotion[],
  usage: Record<string, PromotionUsageStats>,
  now: Date,
): { price: number; original: number; promotion: Promotion | null; bogo: Promotion | null } {
  const q = quote({ lines: [{ product, qty: 1 }], promotions, usage, settings: { shippingFee: 0, freeShippingMin: null }, now });
  const line = q.lines.find((l) => !l.isGift);
  const promotion = line?.promotionId ? (promotions.find((p) => p.id === line.promotionId) ?? null) : null;
  const bogo =
    promotions.find(
      (p) => p.type === 'bogo' && isLive(p, now, usage[p.id] ?? EMPTY_USAGE) && matchesScope(p, product) && remainingPerProduct(p, product.id, usage[p.id] ?? EMPTY_USAGE) > 0,
    ) ?? null;
  return { price: line?.total ?? product.price, original: product.price, promotion, bogo };
}
