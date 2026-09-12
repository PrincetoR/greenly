import { z } from 'zod';

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(100),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^0\d{8,9}$/, 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0')),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง').or(z.literal('')),
  address: z.string().trim().min(10, 'กรุณากรอกที่อยู่จัดส่งให้ครบ').max(500),
  paymentMethod: z.enum(['transfer', 'cod'], { message: 'กรุณาเลือกวิธีชำระเงิน' }),
  note: z.string().trim().max(500).default(''),
});
export type CheckoutValues = z.infer<typeof checkoutSchema>;
