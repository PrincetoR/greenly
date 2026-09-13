/**
 * Domain types ทั้งระบบ — pure module ไม่ import อะไรเลย
 * ทั้ง server (db/actions), client component และ pricing engine ใช้ไฟล์นี้ร่วมกัน
 *
 * เงินทุกค่าเป็น "สตางค์" (integer) — แปลงเป็นบาทที่จุดแสดงผลเท่านั้น (ดู lib/money.ts)
 * เวลาเป็น ISO string เสมอ
 */

export type Role = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  /** สตางค์ */
  price: number;
  stock: number;
  /** path ใต้ /uploads เช่น "/uploads/abc.webp" — รูปแรกคือรูปปก */
  images: string[];
  active: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromotionType = 'discount' | 'coupon' | 'bogo';
export type DiscountMode = 'percent' | 'fixed';

export interface PromotionScope {
  kind: 'all' | 'categories' | 'products';
  ids: string[];
}

export interface PromotionLimits {
  /** จำกัดจำนวน order ที่ใช้โปรนี้ได้ทั้งหมด · null = ไม่จำกัด */
  totalUses: number | null;
  /** จำกัดจำนวนชิ้นที่ได้ราคาโปร ต่อสินค้าหนึ่งตัว · null = ไม่จำกัด */
  perProductQty: number | null;
  /** จำกัดจำนวน order ต่อลูกค้าหนึ่งคน (ระบุด้วยเบอร์โทร) · null = ไม่จำกัด */
  perCustomer: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  active: boolean;
  startsAt: string;
  endsAt: string;
  scope: PromotionScope;
  /** discount + coupon · fixed = สตางค์, percent = 0–100 */
  discount: { mode: DiscountMode; value: number } | null;
  /** coupon เท่านั้น · minSubtotal เป็นสตางค์ */
  coupon: { code: string; minSubtotal: number | null; freeShipping: boolean } | null;
  /** bogo เท่านั้น · แถมสินค้าตัวเดียวกัน */
  bogo: { buyQty: number; getQty: number } | null;
  limits: PromotionLimits;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'done' | 'cancelled';
export type PaymentMethod = 'transfer' | 'cod';

export interface OrderLine {
  productId: string;
  name: string;
  image: string | null;
  /** ราคาเต็มต่อชิ้น (สตางค์) */
  unitPrice: number;
  qty: number;
  /** ส่วนลดรวมของบรรทัดนี้ (สตางค์) */
  discount: number;
  promotionId: string | null;
  /** ของแถมจาก bogo — ราคา 0 */
  isGift: boolean;
}

/** บันทึกการใช้โปรใน order หนึ่ง ๆ — แหล่งเดียวที่ใช้นับ quota */
export interface PromotionUsage {
  promotionId: string;
  /** null = ใช้กับทั้ง order (คูปอง) */
  productId: string | null;
  /** จำนวนชิ้นที่ได้สิทธิ์ (คูปอง = 1) */
  qty: number;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  /** guest id (cookie) ของเบราว์เซอร์ที่สั่ง + เครื่องอื่นที่ยืนยันด้วยเบอร์โทรแล้ว — ใช้แสดง "คำสั่งซื้อของฉัน" */
  guestIds: string[];
  customer: OrderCustomer;
  lines: OrderLine[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  promotionUsages: PromotionUsage[];
  paymentMethod: PaymentMethod;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  storeName: string;
  tagline: string;
  /** สตางค์ */
  shippingFee: number;
  /** สตางค์ · null = ไม่มีส่งฟรี */
  freeShippingMin: number | null;
  /** แจ้งเตือนสินค้าใกล้หมดเมื่อ stock ต่ำกว่าหรือเท่ากับค่านี้ */
  lowStockThreshold: number;
  contact: { phone: string; email: string; line: string };
  /** แดชบอร์ด: แสดงหมวด/สินค้าขายดีกี่อันดับ (ตั้งจากรูปเฟืองบนการ์ด) */
  dashboard: DashboardRanks;
}

export interface DashboardRanks {
  topPromotions: number;
  topCategories: number;
  topProducts: number;
}
export type DashboardRankKey = keyof DashboardRanks;
