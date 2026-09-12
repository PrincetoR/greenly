import { z } from 'zod';
import { checkbox } from './common';

export const userSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,30}$/, 'ชื่อผู้ใช้ใช้ a–z 0–9 . _ - ยาว 3–30 ตัว'),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(80),
  role: z.enum(['admin', 'staff'], { message: 'กรุณาเลือกสิทธิ์' }),
  password: z.string().min(8, 'รหัสผ่านอย่างน้อย 8 ตัวอักษร').max(100),
  active: checkbox,
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1, 'กรุณากรอกชื่อร้าน').max(60),
  tagline: z.string().trim().max(120),
  shippingFee: z.string().trim(),
  freeShippingMin: z.string().trim(),
  lowStockThreshold: z.string().trim(),
  phone: z.string().trim().max(30),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง').or(z.literal('')),
  line: z.string().trim().max(40),
});
