'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { findOrder, updateOrderStatus } from '@/lib/db/orders';
import { restoreStock } from '@/lib/db/products';
import { NEXT_STATUS } from '@/lib/orders/labels';
import type { OrderStatus } from '@/lib/types';

export async function changeOrderStatus(formData: FormData): Promise<void> {
  await requirePermission('order.manage');
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as OrderStatus;
  const order = await findOrder(id);
  if (!order) redirect('/admin/orders');
  // เปลี่ยนได้เฉพาะสถานะถัดไปที่กำหนด — กันกดผิดหรือยิง POST ตรง ๆ
  if (!NEXT_STATUS[order.status].includes(status)) redirect(`/admin/orders/${id}?error=transition`);

  await updateOrderStatus(id, status);
  // ยกเลิก → คืน stock ทั้งหมดรวมของแถม · สิทธิ์โปรคืนเองเพราะ usage นับเฉพาะ order ที่ไม่ cancelled
  if (status === 'cancelled') await restoreStock(order.lines.map((l) => ({ productId: l.productId, qty: l.qty })));
  revalidatePath('/', 'layout');
  redirect(`/admin/orders/${id}?updated=1`);
}
