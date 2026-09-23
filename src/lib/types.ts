/**
 * Domain types ทั้งระบบ — pure module ไม่ import อะไรเลย
 * ทั้ง server (db/actions), client component และ pricing engine ใช้ไฟล์นี้ร่วมกัน
 *
 * เงินทุกค่าเป็น "สตางค์" (integer) — แปลงเป็นบาทที่จุดแสดงผลเท่านั้น (ดู lib/money.ts)
 * เวลาเป็น ISO string เสมอ
 */

/** customer = ลูกค้าที่ login จากหน้าโปรไฟล์ — ไม่มีสิทธิ์หลังบ้านเลย (พี่ต่อสั่ง 2026-09-15) */
export type Role = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

/** ชื่อไอคอนหมวดหมู่ (lucide) — รายการที่เลือกได้อยู่ที่ lib/catalog/category-icons.ts, component map ที่ components/category-icon.tsx */
export type CategoryIconName =
  | 'cup-soda'
  | 'coffee'
  | 'wheat'
  | 'cookie'
  | 'apple'
  | 'cherry'
  | 'carrot'
  | 'pill'
  | 'cooking-pot'
  | 'utensils'
  | 'leaf'
  | 'sparkles'
  | 'heart'
  | 'gift'
  | 'shopping-bag'
  | 'package'
  | 'shirt'
  | 'baby'
  | 'dumbbell'
  | 'home';

export interface Category {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  active: boolean;
  /** รูปหมวด (อัปโหลด) — ถ้ามีใช้แทนไอคอนบนการ์ดหน้าแรก */
  image: string | null;
  /** ชื่อไอคอน lucide จาก lib/catalog/category-icons */
  icon: CategoryIconName | null;
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

/**
 * วงจรคำสั่งซื้อ: pending (รอชำระ/ยืนยัน) → paid (รอแพ็ค) → packing (กำลังแพ็ค) → shipped (จัดส่งแล้ว) → done (ถึงมือลูกค้า)
 * shipped → returned (ตีกลับ) → packing (ส่งใหม่) หรือ cancelled · ทุกสถานะก่อนส่งยกเลิกได้ · การคืนเงินอยู่ที่ payment ไม่ใช่สถานะออเดอร์
 */
export type OrderStatus = 'pending' | 'paid' | 'packing' | 'shipped' | 'done' | 'returned' | 'cancelled';
/** วิธีชำระที่ลูกค้าเลือกตอน checkout: beam = ชำระออนไลน์ผ่าน Beam (เลือกช่องทางย่อยที่หน้า Beam) · cod = เก็บเงินปลายทาง */
export type PaymentMethod = 'beam' | 'cod';

/** ช่องทางย่อยของ Beam (mock) + cod */
export type PaymentChannel = 'promptpay' | 'card' | 'mobile_banking' | 'truemoney' | 'shopeepay' | 'linepay' | 'alipay' | 'wechatpay' | 'installment' | 'bnpl' | 'cod';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired' | 'refunded' | 'partially_refunded';

/** สรุปการชำระเงินที่ฝังใน order — รายละเอียดเต็มอยู่ใน data/payments.json (Beam) */
export interface OrderPayment {
  provider: 'beam' | 'cod';
  channel: PaymentChannel | null;
  /** id ใน payments.json (beam เท่านั้น) */
  paymentId: string | null;
  status: PaymentStatus;
  amount: number;
  /** ค่าธรรมเนียม (สตางค์) ที่ผู้ให้บริการหัก */
  fee: number;
  paidAt: string | null;
  refundedAmount: number;
}

export type CarrierId = 'kerry' | 'flash' | 'jt' | 'thaipost' | 'spx' | 'ninja' | 'best' | 'dhl';

export interface Shipment {
  carrier: CarrierId;
  trackingNo: string;
  shippedAt: string;
  deliveredAt: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  /** น้ำหนัก (กรัม) / ขนาดกล่อง — ใส่ตอนแพ็ค ใช้พิมพ์ใบปะหน้า */
  weightGrams: number | null;
  boxSize: string | null;
  note: string;
}

/** บันทึกเหตุการณ์ของออเดอร์ (เปลี่ยนสถานะ ชำระเงิน จัดส่ง โน้ต) — แสดงเป็นไทม์ไลน์ */
export interface OrderEvent {
  at: string;
  /** สถานะที่เปลี่ยนไป · 'payment' / 'shipment' / 'note' = เหตุการณ์ที่ไม่เปลี่ยนสถานะ */
  type: OrderStatus | 'payment' | 'shipment' | 'note';
  /** ใครทำ: 'customer' · 'system' · username หลังบ้าน */
  by: string;
  note: string;
}

/** รายการชำระเงินฝั่ง Beam (mock) — 1 ออเดอร์มีได้หลายรายการ (ชำระไม่สำเร็จแล้วลองใหม่) */
export interface Payment {
  id: string;
  orderId: string;
  orderNo: string;
  provider: 'beam';
  channel: PaymentChannel | null;
  amount: number;
  fee: number;
  net: number;
  status: PaymentStatus;
  /** เลขอ้างอิงจาก Beam (mock) */
  reference: string | null;
  /** ใช้เมื่อ channel = installment: จำนวนงวด */
  installmentTerm: number | null;
  customer: { name: string; phone: string };
  refunds: PaymentRefund[];
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  expiresAt: string;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  reason: string;
  at: string;
  by: string;
}

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
  payment: OrderPayment | null;
  shipment: Shipment | null;
  history: OrderEvent[];
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
  payments: PaymentSettings;
  shipping: ShippingSettings;
}

export interface PaymentSettings {
  beam: {
    enabled: boolean;
    mode: 'sandbox' | 'live';
    merchantId: string;
    publicKey: string;
    /** เก็บเฉพาะ 4 ตัวท้ายไว้โชว์ (mock — ของจริงต้องอยู่ใน env) */
    secretKeyLast4: string;
    /** ช่องทางที่เปิดรับ */
    channels: Partial<Record<Exclude<PaymentChannel, 'cod'>, boolean>>;
    /** นาทีที่รายการชำระมีอายุ */
    expiryMinutes: number;
  };
  cod: { enabled: boolean; /** ค่าธรรมเนียม COD (สตางค์) */ fee: number };
}

export interface ShippingSettings {
  /** ชื่อ/ที่อยู่ผู้ส่งบนใบปะหน้า */
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  /** ขนส่งที่ร้านใช้ (แสดงในตัวเลือกตอนจัดส่ง) */
  carriers: CarrierId[];
  defaultCarrier: CarrierId;
}

export interface DashboardRanks {
  topPromotions: number;
  topCategories: number;
  topProducts: number;
}
export type DashboardRankKey = keyof DashboardRanks;

/* ---------- หน้าแรก: สไลด์ + ป๊อปอัป (data/homepage.json) ---------- */
export interface HeroSlide {
  id: string;
  /** รูปแบนเนอร์ (อัปโหลด) แนะนำ 1600×600 */
  image: string;
  title: string;
  subtitle: string;
  /** คลิกแล้วไปไหน — path ในเว็บ (/promotions, /category/…, /product/…) หรือ URL เต็ม · ว่าง = คลิกไม่ได้ (คลิกทั้งภาพ ไม่มีปุ่ม) */
  href: string;
  active: boolean;
  sortOrder: number;
  /** main = สไลด์ใหญ่ซ้าย (เลื่อน) · side = ภาพเล็กด้านขวา 2 ช่อง (นิ่ง แบบ Shopee) */
  slot: 'main' | 'side';
}

export type PopupFrequency = 'once' | 'daily' | 'always';

export interface HomePopup {
  enabled: boolean;
  image: string | null;
  title: string;
  body: string;
  /** คลิกที่รูป/เนื้อหาแล้วไปไหน · ว่าง = แค่แสดง (ไม่มีปุ่ม) */
  href: string;
  /** ความกว้างสูงสุด (px) — จอเล็กจะย่อให้พอดีเอง */
  width: number;
  /** แสดงบ่อยแค่ไหน: once = ครั้งเดียวต่อเบราว์เซอร์ · daily = วันละครั้ง · always = ทุกครั้งที่เปิดหน้าแรก */
  frequency: PopupFrequency;
  /** เปลี่ยนทุกครั้งที่บันทึก → ลูกค้าที่เคยปิดแล้วเห็นป๊อปอัปใหม่ */
  version: string;
}

export interface Homepage {
  slides: HeroSlide[];
  /** เปลี่ยนสไลด์ทุกกี่วินาที · 0 = ไม่เลื่อนเอง */
  autoplaySeconds: number;
  popup: HomePopup;
}

/* ---------- บทความ (data/articles.json) ---------- */
export interface Article {
  id: string;
  slug: string;
  title: string;
  /** สรุปสั้น 1–2 บรรทัด — แสดงบนการ์ดและใช้เป็น description ของหน้า */
  excerpt: string;
  /**
   * เนื้อหาเป็นข้อความล้วน — ย่อหน้าคั่นด้วยบรรทัดว่าง
   * บรรทัดขึ้นต้น "## " = หัวข้อย่อย · "- " = รายการ (ดู components/shop/article-body.tsx)
   */
  body: string;
  /** รูปปก (อัปโหลด) · null = ใช้พื้นหลังเปล่า */
  cover: string | null;
  /** ชื่อผู้เขียนที่แสดงใต้หัวข้อ */
  author: string;
  /** false = ฉบับร่าง ไม่ขึ้นหน้าร้าน */
  published: boolean;
  /** เวลาที่ให้ขึ้นหน้าร้าน — อนาคต = ตั้งเวลาไว้ ยังไม่แสดง (กติกาเดียวกับโปรโมชัน) */
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}
