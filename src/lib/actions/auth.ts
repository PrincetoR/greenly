'use server';

import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { findUserByUsername } from '@/lib/db/users';
import { isStaffRole } from '@/lib/auth/roles';

export interface LoginState {
  error?: string;
  /** ชื่อผู้ใช้ที่กรอก — คืนกลับให้ฟอร์มตอนรหัสผิด (React รีเซ็ตฟอร์มหลัง action) */
  username?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  const user = await findUserByUsername(username);
  // ตรวจรหัสเสมอแม้ไม่พบผู้ใช้ เพื่อไม่ให้เดาได้จากเวลาตอบว่ามี username นี้หรือไม่
  const ok = await verifyPassword(password, user?.passwordHash ?? 'scrypt$00$00');
  if (!user || !ok) return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', username };
  if (!user.active) return { error: 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ', username };

  await createSession(user);
  // ลูกค้า → โปรไฟล์เสมอ · พนักงาน → การจัดการ (พี่ต่อสั่ง 2026-09-15) · next ใช้เฉพาะ deep link ใน /admin/* กัน open redirect
  if (!isStaffRole(user.role)) redirect('/account');
  redirect(next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');
}

/** ออกจากระบบ (hamburger หลังบ้าน / ปุ่มล่างโปรไฟล์ลูกค้า) → หน้าแรกเสมอ (พี่ต่อสั่ง 2026-09-15) */
export async function logout(): Promise<void> {
  await destroySession();
  redirect('/');
}
