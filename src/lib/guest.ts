import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * ตัวตนของลูกค้าแบบไม่ต้อง login — id สุ่มใน cookie อายุ 1 ปี
 * ตะกร้าและคำสั่งซื้อผูกกับ id นี้ → ปิดเบราว์เซอร์แล้วกลับมา ของยังอยู่
 * เปลี่ยนเครื่อง/ล้าง cookie = ตัวตนใหม่ → ดูออเดอร์เก่าได้ด้วยเลขที่ + เบอร์โทร (ดู actions/customer-orders.ts)
 */
export const GUEST_COOKIE = 'ec_guest';
const GUEST_TTL_SEC = 60 * 60 * 24 * 365;
const GUEST_ID_RE = /^g-[a-z0-9]{16,}$/;

export async function readGuestId(): Promise<string | null> {
  const v = (await cookies()).get(GUEST_COOKIE)?.value;
  return v && GUEST_ID_RE.test(v) ? v : null;
}

/** ใช้ได้เฉพาะใน server action — ถ้ายังไม่มี id จะสร้างและตั้ง cookie ให้ (ต่ออายุทุกครั้งที่เรียก) */
export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  // hex ล้วน → ความยาวคงที่ 24 ตัว ผ่าน GUEST_ID_RE เสมอ (base64url มี - และ _ ทำให้ความยาวไม่แน่นอน)
  const id = (await readGuestId()) ?? `g-${randomBytes(12).toString('hex')}`;
  store.set(GUEST_COOKIE, id, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: GUEST_TTL_SEC });
  return id;
}
