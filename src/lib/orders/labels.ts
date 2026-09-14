import type { OrderStatus, PaymentChannel, PaymentMethod, PaymentStatus } from '@/lib/types';
import type { BadgeTone } from '@/components/ui/badge';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'รอชำระ/ยืนยัน',
  paid: 'รอแพ็ค',
  packing: 'กำลังแพ็ค',
  shipped: 'จัดส่งแล้ว',
  done: 'ถึงมือลูกค้า',
  returned: 'ตีกลับ',
  cancelled: 'ยกเลิก',
};

/** คำอธิบายสั้นใต้สถานะ (หน้าลูกค้า) */
export const ORDER_STATUS_HINT: Record<OrderStatus, string> = {
  pending: 'รอการชำระเงินหรือการยืนยันจากร้าน',
  paid: 'ร้านได้รับคำสั่งซื้อแล้ว กำลังจัดคิวแพ็คสินค้า',
  packing: 'กำลังเตรียมสินค้าและบรรจุลงกล่อง',
  shipped: 'ส่งมอบให้ขนส่งแล้ว ติดตามพัสดุได้ด้านล่าง',
  done: 'พัสดุถึงมือคุณแล้ว ขอบคุณที่อุดหนุน',
  returned: 'พัสดุถูกส่งคืนร้าน — ร้านจะติดต่อกลับเพื่อส่งใหม่หรือคืนเงิน',
  cancelled: 'คำสั่งซื้อถูกยกเลิก',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warn',
  paid: 'info',
  packing: 'info',
  shipped: 'brand',
  done: 'ok',
  returned: 'danger',
  cancelled: 'danger',
};

/** ลำดับขั้นปกติ (ใช้วาด stepper) — returned/cancelled เป็นทางแยก ไม่อยู่ในแถว */
export const ORDER_STEPS: OrderStatus[] = ['pending', 'paid', 'packing', 'shipped', 'done'];

/**
 * สถานะถัดไปที่หลังบ้านเปลี่ยนได้ — ไม่ให้ย้อนกลับ ยกเว้นตีกลับแล้วส่งใหม่
 * shipped ต้องมีเลขพัสดุ (ตรวจใน action) · ยกเลิกได้ทุกสถานะก่อนส่ง
 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: ['done', 'returned'],
  returned: ['packing', 'cancelled'],
  done: [],
  cancelled: [],
};

/** ข้อความบนปุ่มเปลี่ยนสถานะ (กริยา) — ต่างจากป้ายสถานะ (คำนาม) */
export const TRANSITION_LABEL: Record<OrderStatus, string> = {
  pending: 'รอชำระ',
  paid: 'ยืนยันรับชำระ / รับออเดอร์',
  packing: 'เริ่มแพ็ค',
  shipped: 'จัดส่ง',
  done: 'ถึงมือลูกค้าแล้ว',
  returned: 'พัสดุตีกลับ',
  cancelled: 'ยกเลิกคำสั่งซื้อ',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  // ลูกค้าไม่ต้องรู้ว่าเบื้องหลังเป็น Beam (พี่ต่อสั่ง) — หลังบ้านดู provider จาก order.payment
  beam: 'ชำระออนไลน์',
  cod: 'เก็บเงินปลายทาง',
};

export const PAYMENT_CHANNEL_LABEL: Record<PaymentChannel, string> = {
  promptpay: 'PromptPay QR',
  card: 'บัตรเครดิต/เดบิต',
  mobile_banking: 'Mobile Banking',
  truemoney: 'TrueMoney Wallet',
  shopeepay: 'ShopeePay',
  linepay: 'LINE Pay',
  alipay: 'Alipay',
  wechatpay: 'WeChat Pay',
  installment: 'ผ่อนชำระ 0%',
  bnpl: 'ซื้อก่อนจ่ายทีหลัง',
  cod: 'เงินสดปลายทาง',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'รอชำระ',
  succeeded: 'ชำระสำเร็จ',
  failed: 'ไม่สำเร็จ',
  expired: 'หมดอายุ',
  refunded: 'คืนเงินแล้ว',
  partially_refunded: 'คืนเงินบางส่วน',
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  pending: 'warn',
  succeeded: 'ok',
  failed: 'danger',
  expired: 'neutral',
  refunded: 'info',
  partially_refunded: 'info',
};
