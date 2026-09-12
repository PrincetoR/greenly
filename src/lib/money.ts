/**
 * เงินเก็บเป็นสตางค์ (integer) ทั้งระบบ — ไฟล์นี้คือจุดเดียวที่แปลงไป/กลับจากบาท
 * pure module ใช้ได้ทั้ง server และ client
 */

const thb = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** 129000 → "฿1,290" · 129050 → "฿1,290.50" */
export function formatBaht(satang: number): string {
  return `฿${thb.format(satang / 100)}`;
}

/** สำหรับช่องกรอกในฟอร์ม: 129050 → "1290.50" · 129000 → "1290" */
export function satangToInput(satang: number): string {
  return (satang / 100).toFixed(2).replace(/\.00$/, '');
}

/** "1,290.5" → 129050 · ค่าที่อ่านไม่ได้ → NaN ให้ validation จับ */
export function toSatang(baht: number | string): number {
  const n = typeof baht === 'string' ? Number(baht.replace(/,/g, '')) : baht;
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** ปัดสตางค์ให้เป็นจำนวนเต็มเสมอ ใช้หลังคูณเปอร์เซ็นต์ */
export function roundSatang(value: number): number {
  return Math.round(value);
}
