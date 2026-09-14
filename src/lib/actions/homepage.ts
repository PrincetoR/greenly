'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { deleteSlide as dbDeleteSlide, saveAutoplay, savePopup as dbSavePopup, upsertSlide } from '@/lib/db/homepage';
import { checkbox, fieldErrors, formValues, intInput, type FormState } from '@/lib/validation/common';

/** path ในเว็บ (/…) หรือ URL http(s) · ว่าง = ไม่ลิงก์ */
const hrefInput = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), 'ต้องขึ้นต้นด้วย / หรือ https://');
const imageInput = z.string().trim().regex(/^\/uploads\//, 'กรุณาอัปโหลดรูป');

const slideSchema = z.object({
  image: imageInput,
  title: z.string().trim().max(80, 'หัวข้อยาวเกิน 80 ตัวอักษร'),
  subtitle: z.string().trim().max(160, 'ข้อความรองยาวเกิน 160 ตัวอักษร'),
  href: hrefInput,
  buttonLabel: z.string().trim().max(30),
  active: checkbox,
  sortOrder: intInput({ min: 0, max: 999, label: 'ลำดับ' }),
  slot: z.enum(['main', 'side'], { message: 'เลือกตำแหน่ง' }),
});

export async function saveSlide(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('settings.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = slideSchema.safeParse({
    image: formData.get('image') ?? '',
    title: formData.get('title') ?? '',
    subtitle: formData.get('subtitle') ?? '',
    href: formData.get('href') ?? '',
    buttonLabel: formData.get('buttonLabel') ?? '',
    active: formData.get('active'),
    sortOrder: formData.get('sortOrder') ?? '0',
    slot: formData.get('slot') ?? 'main',
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  await upsertSlide({ ...parsed.data, id: id || undefined });
  revalidatePath('/', 'layout');
  redirect('/admin/homepage?saved=slide');
}

export async function deleteSlide(formData: FormData): Promise<void> {
  await requirePermission('settings.manage');
  await dbDeleteSlide(String(formData.get('id') ?? ''));
  revalidatePath('/', 'layout');
  redirect('/admin/homepage?saved=deleted');
}

export async function updateAutoplay(formData: FormData): Promise<void> {
  await requirePermission('settings.manage');
  const sec = Number.parseInt(String(formData.get('autoplaySeconds') ?? ''), 10);
  await saveAutoplay(Number.isInteger(sec) && sec >= 0 && sec <= 60 ? sec : 5);
  revalidatePath('/', 'layout');
  redirect('/admin/homepage?saved=autoplay');
}

const popupSchema = z.object({
  enabled: checkbox,
  image: z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), imageInput.nullable()),
  title: z.string().trim().max(80, 'หัวข้อยาวเกิน 80 ตัวอักษร'),
  body: z.string().trim().max(500, 'ข้อความยาวเกิน 500 ตัวอักษร'),
  href: hrefInput,
  buttonLabel: z.string().trim().max(30),
  width: intInput({ min: 280, max: 1200, label: 'ความกว้าง' }),
  frequency: z.enum(['once', 'daily', 'always'], { message: 'เลือกความถี่' }),
});

export async function savePopup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('settings.manage');
  const parsed = popupSchema.safeParse({
    enabled: formData.get('enabled'),
    image: formData.get('image') ?? '',
    title: formData.get('title') ?? '',
    body: formData.get('body') ?? '',
    href: formData.get('href') ?? '',
    buttonLabel: formData.get('buttonLabel') ?? '',
    width: formData.get('width') ?? '480',
    frequency: formData.get('frequency'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: formValues(formData) };
  if (parsed.data.enabled && !parsed.data.image && !parsed.data.title && !parsed.data.body) return { errors: { title: 'ใส่รูป หัวข้อ หรือข้อความอย่างน้อย 1 อย่าง' }, values: formValues(formData) };
  await dbSavePopup(parsed.data);
  revalidatePath('/', 'layout');
  redirect('/admin/homepage?saved=popup');
}
