import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findUser } from '@/lib/db/users';
import type { Role, User } from '@/lib/types';
import { roleCan, type Permission } from './roles';
import { SESSION_TTL_SEC, decodeToken, encodeToken } from './token';

export const SESSION_COOKIE = 'ec_session';

export interface Session {
  user: Pick<User, 'id' | 'username' | 'name' | 'role'>;
  role: Role;
}

/**
 * อ่าน session ปัจจุบัน — server component / server action เท่านั้น
 * ตรวจกับ users.json ทุกครั้ง เพื่อให้ปิดบัญชีหรือเปลี่ยน role แล้วมีผลทันที ไม่ต้องรอ token หมดอายุ
 */
export async function getSession(): Promise<Session | null> {
  const payload = decodeToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  const user = await findUser(payload.userId);
  if (!user || !user.active) return null;
  return { user: { id: user.id, username: user.username, name: user.name, role: user.role }, role: user.role };
}

export async function createSession(user: User): Promise<void> {
  const token = encodeToken({
    userId: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SEC,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** ใช้บนสุดของ layout/page หลังบ้าน — ยังไม่ล็อกอินให้เด้งไปหน้า login */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return session;
}

/**
 * ใช้ในทุก server action และหน้าที่ต้องใช้สิทธิ์เฉพาะ
 * proxy กันไว้ชั้นหนึ่งแล้ว แต่ server action ถูกยิงตรง ๆ ได้ จึงต้องเช็คซ้ำที่นี่เสมอ
 */
export async function requirePermission(permission: Permission): Promise<Session> {
  const session = await requireSession();
  if (!roleCan(session.role, permission)) redirect('/admin/forbidden');
  return session;
}
