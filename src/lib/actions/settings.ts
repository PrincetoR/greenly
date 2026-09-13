'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, requireSession } from '@/lib/auth/session';
import { getSettings, saveSettings } from '@/lib/db/settings';
import type { DashboardRankKey } from '@/lib/types';
import { isValidRank, RANK_MAX, RANK_MIN } from '@/lib/analytics/ranks';
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


/**
 * จำนวนอันดับบนแดชบอร์ด (หมวด/สินค้าขายดี) — ตั้งจากรูปเฟืองบนการ์ด
 * เป็นการตั้งค่าการแสดงผลของแดชบอร์ด ไม่ใช่ข้อมูลร้าน จึงให้ทุกคนที่ login หลังบ้านเปลี่ยนได้ (ไม่ต้อง settings.manage)
 */
export async function updateDashboardRank(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  await requireSession();
  const key = String(formData.get('key') ?? '');
  const value = Number.parseInt(String(formData.get('value') ?? ''), 10);
  if (key !== 'topCategories' && key !== 'topProducts') return { ok: false, message: 'ไม่รู้จักการตั้งค่านี้' };
  if (!isValidRank(value)) return { ok: false, message: `ต้องเป็นจำนวนเต็ม ${RANK_MIN}–${RANK_MAX}` };
  const { dashboard } = await getSettings();
  await saveSettings({ dashboard: { ...dashboard, [key as DashboardRankKey]: value } });
  revalidatePath('/admin');
  return { ok: true };
}
