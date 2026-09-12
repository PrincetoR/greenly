import { z } from 'zod';
import { bahtInput, checkbox, intInput, slugInput } from './common';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อหมวดหมู่').max(60, 'ชื่อยาวเกิน 60 ตัวอักษร'),
  slug: slugInput,
  sortOrder: intInput({ min: 0, max: 9999, label: 'ลำดับ' }),
  active: checkbox,
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้า').max(120, 'ชื่อยาวเกิน 120 ตัวอักษร'),
  sku: z.string().trim().min(1, 'กรุณากรอก SKU').max(40),
  slug: slugInput,
  description: z.string().trim().max(2000, 'คำอธิบายยาวเกิน 2000 ตัวอักษร'),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  price: bahtInput,
  stock: intInput({ min: 0, max: 1_000_000, label: 'จำนวนคงเหลือ' }),
  images: z.array(z.string().startsWith('/uploads/')).max(6, 'ใส่รูปได้ไม่เกิน 6 รูป'),
  active: checkbox,
  featured: checkbox,
});
