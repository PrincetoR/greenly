import { z } from 'zod';
import { fromDatetimeLocal } from '@/lib/datetime';
import { toSatang } from '@/lib/money';
import type { Promotion } from '@/lib/types';
import { checkbox } from './common';

const datetime = z
  .string()
  .trim()
  .min(1, 'กรุณาเลือกวันและเวลา')
  .transform((s, ctx) => {
    const iso = fromDatetimeLocal(s);
    if (!iso) {
      ctx.addIssue({ code: 'custom', message: 'รูปแบบวันเวลาไม่ถูกต้อง' });
      return z.NEVER;
    }
    return iso;
  });

/** ช่องตัวเลขที่ว่างได้ (= ไม่จำกัด) */
const optionalInt = (label: string) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === '') return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 1) {
        ctx.addIssue({ code: 'custom', message: `${label}ต้องเป็นจำนวนเต็มตั้งแต่ 1` });
        return z.NEVER;
      }
      return n;
    });

const optionalBaht = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === '') return null;
    const n = toSatang(s);
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: 'custom', message: 'ยอดขั้นต่ำต้องเป็นตัวเลขไม่ติดลบ' });
      return z.NEVER;
    }
    return n;
  });

export const promotionFormSchema = z
  .object({
    type: z.enum(['discount', 'coupon', 'bogo'], { message: 'กรุณาเลือกประเภทโปรโมชัน' }),
    name: z.string().trim().min(1, 'กรุณาตั้งชื่อโปรโมชัน').max(80, 'ชื่อยาวเกิน 80 ตัวอักษร'),
    active: checkbox,
    startsAt: datetime,
    endsAt: datetime,
    scopeKind: z.enum(['all', 'categories', 'products']),
    scopeIds: z.array(z.string()).default([]),
    discountMode: z.enum(['percent', 'fixed']).default('percent'),
    discountValue: z.string().trim(),
    couponCode: z.string().trim().toUpperCase(),
    couponMinSubtotal: optionalBaht,
    couponFreeShipping: checkbox,
    bogoBuy: z.string().trim(),
    bogoGet: z.string().trim(),
    limitTotalUses: optionalInt('จำนวนสิทธิ์รวม'),
    limitPerProductQty: optionalInt('จำนวนชิ้นต่อสินค้า'),
    limitPerCustomer: optionalInt('จำนวนครั้งต่อลูกค้า'),
  })
  .superRefine((v, ctx) => {
    if (new Date(v.endsAt).getTime() <= new Date(v.startsAt).getTime()) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม' });
    }
    if (v.scopeKind !== 'all' && v.scopeIds.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['scopeIds'], message: v.scopeKind === 'categories' ? 'เลือกอย่างน้อย 1 หมวดหมู่' : 'เลือกอย่างน้อย 1 สินค้า' });
    }
    if (v.type === 'discount' || (v.type === 'coupon' && !v.couponFreeShipping) || (v.type === 'coupon' && v.discountValue !== '')) {
      const n = Number(v.discountValue);
      if (v.discountValue === '' || !Number.isFinite(n) || n <= 0) {
        ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'กรุณากรอกส่วนลดมากกว่า 0' });
      } else if (v.discountMode === 'percent' && n > 100) {
        ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'เปอร์เซ็นต์ต้องไม่เกิน 100' });
      }
    }
    if (v.type === 'coupon') {
      if (!/^[A-Z0-9]{3,20}$/.test(v.couponCode)) {
        ctx.addIssue({ code: 'custom', path: ['couponCode'], message: 'โค้ดใช้ A–Z, 0–9 ยาว 3–20 ตัว' });
      }
    }
    if (v.type === 'bogo') {
      const buy = Number(v.bogoBuy);
      const get = Number(v.bogoGet);
      if (!Number.isInteger(buy) || buy < 1) ctx.addIssue({ code: 'custom', path: ['bogoBuy'], message: 'จำนวนที่ต้องซื้อต้องเป็นจำนวนเต็มตั้งแต่ 1' });
      if (!Number.isInteger(get) || get < 1) ctx.addIssue({ code: 'custom', path: ['bogoGet'], message: 'จำนวนที่แถมต้องเป็นจำนวนเต็มตั้งแต่ 1' });
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

/** แปลงค่าจากฟอร์มที่ผ่าน validation แล้ว → รูปแบบที่เก็บจริง (เก็บเฉพาะส่วนที่เกี่ยวกับ type) */
export function toPromotionInput(v: PromotionFormValues): Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'> {
  const value = Number(v.discountValue);
  const discount =
    v.type === 'bogo' || (v.type === 'coupon' && v.discountValue === '')
      ? null
      : { mode: v.discountMode, value: v.discountMode === 'percent' ? value : toSatang(value) };
  return {
    name: v.name,
    type: v.type,
    active: v.active,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    scope: { kind: v.scopeKind, ids: v.scopeKind === 'all' ? [] : [...new Set(v.scopeIds)] },
    discount,
    coupon: v.type === 'coupon' ? { code: v.couponCode, minSubtotal: v.couponMinSubtotal, freeShipping: v.couponFreeShipping } : null,
    bogo: v.type === 'bogo' ? { buyQty: Number(v.bogoBuy), getQty: Number(v.bogoGet) } : null,
    limits: { totalUses: v.limitTotalUses, perProductQty: v.limitPerProductQty, perCustomer: v.limitPerCustomer },
  };
}
