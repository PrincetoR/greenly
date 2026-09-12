'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import * as promotions from '@/lib/db/promotions';
import { promotionFormSchema, toPromotionInput } from '@/lib/validation/promotion';
import { fieldErrors, type FormState } from '@/lib/validation/common';

export async function savePromotion(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('promotion.manage');
  const id = String(formData.get('id') ?? '');
  const parsed = promotionFormSchema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    active: formData.get('active'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    scopeKind: formData.get('scopeKind'),
    scopeIds: formData.getAll('scopeIds').map(String),
    discountMode: formData.get('discountMode') ?? 'percent',
    discountValue: formData.get('discountValue') ?? '',
    couponCode: formData.get('couponCode') ?? '',
    couponMinSubtotal: formData.get('couponMinSubtotal') ?? '',
    couponFreeShipping: formData.get('couponFreeShipping'),
    bogoBuy: formData.get('bogoBuy') ?? '',
    bogoGet: formData.get('bogoGet') ?? '',
    limitTotalUses: formData.get('limitTotalUses') ?? '',
    limitPerProductQty: formData.get('limitPerProductQty') ?? '',
    limitPerCustomer: formData.get('limitPerCustomer') ?? '',
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: 'กรุณาตรวจสอบข้อมูลที่กรอก' };

  const input = toPromotionInput(parsed.data);
  if (input.coupon) {
    const dup = await promotions.findPromotionByCode(input.coupon.code);
    if (dup && dup.id !== id) return { errors: { couponCode: `โค้ด ${input.coupon.code} ถูกใช้กับโปร "${dup.name}" แล้ว` } };
  }

  if (id) await promotions.updatePromotion(id, input);
  else await promotions.createPromotion(input);
  revalidatePath('/', 'layout');
  redirect('/admin/promotions?saved=1');
}

export async function togglePromotionActive(formData: FormData): Promise<void> {
  await requirePermission('promotion.manage');
  const id = String(formData.get('id') ?? '');
  const promo = await promotions.findPromotion(id);
  if (promo) await promotions.updatePromotion(id, { active: !promo.active });
  revalidatePath('/', 'layout');
}

export async function duplicatePromotion(formData: FormData): Promise<void> {
  await requirePermission('promotion.manage');
  const promo = await promotions.findPromotion(String(formData.get('id') ?? ''));
  if (!promo) redirect('/admin/promotions');
  const copy = await promotions.createPromotion({
    type: promo.type,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
    scope: promo.scope,
    discount: promo.discount,
    bogo: promo.bogo,
    limits: promo.limits,
    name: `${promo.name} (สำเนา)`,
    active: false,
    // โค้ดคูปองซ้ำไม่ได้ → ต่อท้ายให้แก้เอง
    coupon: promo.coupon ? { ...promo.coupon, code: `${promo.coupon.code}2`.slice(0, 20) } : null,
  });
  revalidatePath('/', 'layout');
  redirect(`/admin/promotions/${copy.id}`);
}

export async function deletePromotion(formData: FormData): Promise<void> {
  await requirePermission('promotion.manage');
  await promotions.deletePromotion(String(formData.get('id') ?? ''));
  revalidatePath('/', 'layout');
  redirect('/admin/promotions');
}
