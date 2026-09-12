'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { saveSettings } from '@/lib/db/settings';
import { toSatang } from '@/lib/money';
import { settingsSchema } from '@/lib/validation/user';
import { fieldErrors, formValues, type FormState } from '@/lib/validation/common';

export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('settings.manage');
  const parsed = settingsSchema.safeParse(Object.fromEntries(['storeName', 'tagline', 'shippingFee', 'freeShippingMin', 'lowStockThreshold', 'phone', 'email', 'line'].map((k) => [k, formData.get(k) ?? ''])));
  const values = formValues(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const v = parsed.data;

  const errors: Record<string, string> = {};
  const shippingFee = toSatang(v.shippingFee);
  if (!Number.isFinite(shippingFee) || shippingFee < 0) errors.shippingFee = 'ค่าส่งต้องเป็นตัวเลขไม่ติดลบ';
  const freeMin = v.freeShippingMin === '' ? null : toSatang(v.freeShippingMin);
  if (freeMin !== null && (!Number.isFinite(freeMin) || freeMin <= 0)) errors.freeShippingMin = 'ยอดส่งฟรีต้องมากกว่า 0 หรือเว้นว่าง';
  const low = Number(v.lowStockThreshold);
  if (!Number.isInteger(low) || low < 0) errors.lowStockThreshold = 'ต้องเป็นจำนวนเต็มไม่ติดลบ';
  if (Object.keys(errors).length) return { errors, values };

  await saveSettings({
    storeName: v.storeName,
    tagline: v.tagline,
    shippingFee,
    freeShippingMin: freeMin,
    lowStockThreshold: low,
    contact: { phone: v.phone, email: v.email, line: v.line },
  });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'บันทึกการตั้งค่าแล้ว' };
}
