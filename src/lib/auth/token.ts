import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role } from '@/lib/types';

/**
 * session token = base64url(payload JSON) + "." + HMAC-SHA256
 * ไฟล์นี้ต้องใช้ได้ทั้งใน proxy (Node runtime) และ server component จึงไม่แตะ next/headers
 * SESSION_SECRET ตั้งใน .env สำหรับใช้จริง · prototype มีค่า fallback เพื่อให้รันได้ทันที
 */
const SECRET = process.env.SESSION_SECRET ?? 'dev-only-secret-change-me';
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: string;
  role: Role;
  /** unix seconds */
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function encodeToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data)}`;
}

/** คืน null ถ้าลายเซ็นผิด หมดอายุ หรือรูปแบบไม่ถูก */
export function decodeToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = sign(data);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
