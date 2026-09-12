'use server';

import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { requirePermission } from '@/lib/auth/session';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * รับไฟล์รูปจาก ImageUploader แล้วเขียนลง public/uploads/
 * ชื่อไฟล์สุ่มใหม่เสมอ ไม่ใช้ชื่อเดิมจากเครื่องผู้ใช้ กัน path traversal และชื่อชนกัน
 */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  await requirePermission('catalog.manage');
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'ไม่พบไฟล์' };
  const ext = ALLOWED[file.type];
  if (!ext) return { ok: false, error: 'รองรับเฉพาะ JPG, PNG, WebP, GIF' };
  if (file.size > MAX_BYTES) return { ok: false, error: 'ไฟล์ใหญ่เกิน 5 MB' };

  const name = `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, path: `/uploads/${name}` };
}
