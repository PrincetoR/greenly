import { z } from 'zod';
import { toSatang } from '@/lib/money';

/** ช่องราคาในฟอร์มรับเป็นบาท (string) → เก็บเป็นสตางค์ */
export const bahtInput = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกราคา')
  .transform((s, ctx) => {
    const satang = toSatang(s);
    if (!Number.isFinite(satang) || satang < 0) {
      ctx.addIssue({ code: 'custom', message: 'ราคาต้องเป็นตัวเลขไม่ติดลบ' });
      return z.NEVER;
    }
    return satang;
  });

export const intInput = (opts: { min?: number; max?: number; label: string }) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      const n = Number(s);
      if (s === '' || !Number.isInteger(n)) {
        ctx.addIssue({ code: 'custom', message: `${opts.label}ต้องเป็นจำนวนเต็ม` });
        return z.NEVER;
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({ code: 'custom', message: `${opts.label}ต้องไม่น้อยกว่า ${opts.min}` });
        return z.NEVER;
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({ code: 'custom', message: `${opts.label}ต้องไม่เกิน ${opts.max}` });
        return z.NEVER;
      }
      return n;
    });

/** checkbox ใน FormData มาเป็น "on" หรือไม่มีเลย */
export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());

export const slugInput = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9ก-๙]+(?:-[a-z0-9ก-๙]+)*$/, 'slug ใช้ได้เฉพาะตัวอักษร ตัวเลข และขีดกลาง');

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** แปลง ZodError → { field: message } เอาข้อความแรกของแต่ละช่อง */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** รูปแบบผลลัพธ์มาตรฐานของ server action ที่รับฟอร์ม */
export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}
