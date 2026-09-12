import type { Product, Promotion, PromotionUsage } from '@/lib/types';

/** สินค้าในตะกร้าที่ engine ต้องรู้ — product เต็มก้อนเพื่อให้ scope/stock ใช้ได้ */
export interface QuoteLineInput {
  product: Product;
  qty: number;
}

/** ยอดใช้โปรที่นับมาจาก orders — engine ไม่อ่านไฟล์เอง ผู้เรียกส่งเข้ามา */
export interface PromotionUsageStats {
  /** จำนวน order (ไม่ cancelled) ที่ใช้โปรนี้ */
  totalUses: number;
  /** จำนวนชิ้นที่ได้ราคาโปร แยกตาม productId */
  perProduct: Record<string, number>;
  /** จำนวน order ของลูกค้าคนนี้ (customerKey) ที่ใช้โปรนี้ */
  byCustomer: number;
}

export interface QuoteInput {
  lines: QuoteLineInput[];
  promotions: Promotion[];
  usage: Record<string, PromotionUsageStats>;
  settings: { shippingFee: number; freeShippingMin: number | null };
  couponCode?: string | null;
  /** เบอร์โทรลูกค้า — ตะกร้ายังไม่รู้ (undefined) ส่วน checkout รู้แล้ว */
  customerKey?: string | null;
  now: Date;
}

export interface QuoteLine {
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  qty: number;
  /** ส่วนลดรวมของบรรทัด (สตางค์) */
  discount: number;
  /** จำนวนชิ้นที่ได้ราคาโปร (≤ qty) */
  discountedQty: number;
  promotionId: string | null;
  promotionName: string | null;
  isGift: boolean;
  /** ราคาสุทธิของบรรทัด */
  total: number;
}

export interface AppliedPromotion {
  promotionId: string;
  name: string;
  type: Promotion['type'];
  amount: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  applied: AppliedPromotion[];
  /** ข้อความเตือนลูกค้า เช่น "ลดได้อีก 3 ชิ้น" */
  warnings: string[];
  coupon: { code: string; status: 'applied' | 'invalid' | 'expired' | 'min-subtotal' | 'exhausted' | 'per-customer'; message: string } | null;
  usages: PromotionUsage[];
}
