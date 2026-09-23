import { z } from 'zod';
import { fromDatetimeLocal } from '@/lib/datetime';
import { UPLOADED_IMAGE, checkbox, slugInput } from './common';

export const articleSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อบทความ').max(120, 'หัวข้อยาวเกิน 120 ตัวอักษร'),
  slug: slugInput,
  excerpt: z.string().trim().min(1, 'กรุณากรอกสรุปสั้น').max(300, 'สรุปยาวเกิน 300 ตัวอักษร'),
  body: z.string().trim().min(1, 'กรุณากรอกเนื้อหา').max(20_000, 'เนื้อหายาวเกิน 20,000 ตัวอักษร'),
  author: z.string().trim().max(60, 'ชื่อผู้เขียนยาวเกิน 60 ตัวอักษร'),
  cover: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
    z.string().regex(UPLOADED_IMAGE, 'รูปไม่ถูกต้อง').max(300).nullable(),
  ),
  published: checkbox,
  publishedAt: z
    .string()
    .trim()
    .min(1, 'กรุณาเลือกวันและเวลาเผยแพร่')
    .transform((s, ctx) => {
      const iso = fromDatetimeLocal(s);
      if (!iso) {
        ctx.addIssue({ code: 'custom', message: 'รูปแบบวันเวลาไม่ถูกต้อง' });
        return z.NEVER;
      }
      return iso;
    }),
});
