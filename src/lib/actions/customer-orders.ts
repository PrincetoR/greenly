'use server';

import { redirect } from 'next/navigation';
import { claimOrder } from '@/lib/db/orders';
import { ensureGuestId } from '@/lib/guest';

export interface LookupState {
  error?: string;
  values?: { orderNo?: string };
}

/**
 * ค้นหา/ยืนยันสิทธิ์ดูออเดอร์ด้วย เลขที่ + เบอร์โทร — สำหรับลูกค้าที่เปลี่ยนเครื่องหรือล้าง cookie
 * สำเร็จ = ผูก order กับ guest id ของเครื่องนี้ แล้วพาไปหน้าออเดอร์ (ครั้งต่อไปไม่ต้องกรอกอีก)
 * ตอบข้อความเดียวกันไม่ว่าจะไม่พบเลขที่หรือเบอร์ไม่ตรง เพื่อไม่ให้ใช้เดาว่าเลขไหนมีจริง
 */
export async function lookupOrder(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const orderNo = String(formData.get('orderNo') ?? '').trim().toUpperCase();
  const phone = String(formData.get('phone') ?? '').trim();
  if (!orderNo || !phone) return { error: 'กรุณากรอกเลขที่คำสั่งซื้อและเบอร์โทร', values: { orderNo } };

  const guestId = await ensureGuestId();
  const order = await claimOrder(orderNo, phone, guestId);
  if (!order) return { error: 'ไม่พบคำสั่งซื้อที่ตรงกับเลขที่และเบอร์โทรนี้', values: { orderNo } };
  redirect(`/order/${order.orderNo}`);
}
