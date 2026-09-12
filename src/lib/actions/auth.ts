'use server';

import { redirect } from 'next/navigation';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { findUserByUsername } from '@/lib/db/users';

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  const user = await findUserByUsername(username);
  // ตรวจรหัสเสมอแม้ไม่พบผู้ใช้ เพื่อไม่ให้เดาได้จากเวลาตอบว่ามี username นี้หรือไม่
  const ok = await verifyPassword(password, user?.passwordHash ?? 'scrypt$00$00');
  if (!user || !ok) return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  if (!user.active) return { error: 'บัญชีนี้ถูกปิดใช้งาน ติดต่อผู้ดูแลระบบ' };

  await createSession(user);
  // รับเฉพาะ path ภายใน /admin กัน open redirect
  redirect(next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin');
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/admin/login');
}
