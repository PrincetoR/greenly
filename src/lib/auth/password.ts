import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * hash รหัสผ่านด้วย scrypt จาก node:crypto — ไม่ต้องพึ่ง bcrypt
 * รูปแบบที่เก็บ: "scrypt$<salt hex>$<hash hex>"
 * ไฟล์นี้ import ได้ทั้งจาก server action และ script (scripts/hash-password.ts)
 */

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hex) return false;
  const key = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  const expected = Buffer.from(hex, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
