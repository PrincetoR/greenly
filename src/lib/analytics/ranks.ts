/** ขอบเขตจำนวนอันดับบนแดชบอร์ด (หมวด/สินค้าขายดี) — pure ใช้ทั้ง action และ client */
export const RANK_MIN = 1;
export const RANK_MAX = 50;
/** ตัวเลือกลัดในป๊อปอัปรูปเฟือง */
export const RANK_PRESETS = [5, 10, 20] as const;

export function isValidRank(value: number): boolean {
  return Number.isInteger(value) && value >= RANK_MIN && value <= RANK_MAX;
}
