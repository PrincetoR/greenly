import type { OrderStatus, PaymentMethod } from '@/lib/types';
import type { BadgeTone } from '@/components/ui/badge';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'รอชำระ/ยืนยัน',
  paid: 'ชำระแล้ว',
  shipped: 'จัดส่งแล้ว',
  done: 'สำเร็จ',
  cancelled: 'ยกเลิก',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warn',
  paid: 'info',
  shipped: 'brand',
  done: 'ok',
  cancelled: 'danger',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  transfer: 'โอนเงินผ่านธนาคาร',
  cod: 'เก็บเงินปลายทาง',
};

/** สถานะถัดไปที่หลังบ้านเปลี่ยนได้ — ไม่ให้ย้อนกลับ ยกเว้นยกเลิก */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['done'],
  done: [],
  cancelled: [],
};
