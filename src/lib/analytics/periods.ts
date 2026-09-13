/**
 * ช่วงเวลาของสถิติแดชบอร์ด — pure module ใช้ได้ทั้ง server/test
 * ทุกช่องนับตามเวลาไทย (ไม่มี DST → บวกลบ offset ตรง ๆ ได้ ไม่ต้องพึ่ง TZ ของเครื่อง)
 */
export type Range = 'day' | 'month' | 'year';

export const RANGES: { value: Range; label: string; hint: string }[] = [
  { value: 'day', label: 'รายวัน', hint: '30 วันล่าสุด' },
  { value: 'month', label: 'รายเดือน', hint: '12 เดือนล่าสุด' },
  { value: 'year', label: 'รายปี', hint: '5 ปีล่าสุด' },
];
export const BUCKETS: Record<Range, number> = { day: 30, month: 12, year: 5 };

export function parseRange(value: unknown): Range {
  return value === 'month' || value === 'year' ? value : 'day';
}

const BKK_OFFSET_MS = 7 * 3_600_000;
const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** ปี/เดือน/วัน ตามเวลาไทยของ instant นี้ */
export function bangkokYmd(date: Date): { y: number; m: number; d: number } {
  const t = new Date(date.getTime() + BKK_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** เที่ยงคืนไทยของวันนั้น — Date.UTC จัดการเดือน/วันที่ล้น (เช่น เดือน 0 = ธ.ค. ปีก่อน) ให้เอง */
export const bangkokStart = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - BKK_OFFSET_MS);

export interface Period {
  key: string;
  label: string;
  start: Date;
  /** ไม่รวม (exclusive) */
  end: Date;
}

/**
 * ช่อง `count` ช่องล่าสุด เรียงเก่า → ใหม่ · ช่องสุดท้ายคือช่องที่ `now` อยู่
 * `offset` = เลื่อนถอยหลังเป็นจำนวนช่อง (offset = count → ช่วง "ก่อนหน้า" ที่ยาวเท่ากัน ใช้เทียบ)
 */
export function periods(range: Range, now: Date, count = BUCKETS[range], offset = 0): Period[] {
  const { y, m, d } = bangkokYmd(now);
  const out: Period[] = [];
  for (let i = count - 1 + offset; i >= offset; i--) {
    if (range === 'day') {
      const start = bangkokStart(y, m, d - i);
      const p = bangkokYmd(start);
      out.push({ key: `${p.y}-${pad(p.m)}-${pad(p.d)}`, label: `${p.d} ${TH_MONTH_SHORT[p.m - 1]}`, start, end: bangkokStart(y, m, d - i + 1) });
    } else if (range === 'month') {
      const start = bangkokStart(y, m - i, 1);
      const p = bangkokYmd(start);
      out.push({ key: `${p.y}-${pad(p.m)}`, label: `${TH_MONTH_SHORT[p.m - 1]} ${String(p.y + 543).slice(-2)}`, start, end: bangkokStart(y, m - i + 1, 1) });
    } else {
      const start = bangkokStart(y - i, 1, 1);
      out.push({ key: String(y - i), label: String(y - i + 543), start, end: bangkokStart(y - i + 1, 1, 1) });
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** % เปลี่ยนแปลง · null เมื่อฐานเป็น 0 (ไม่มีอะไรให้เทียบ) */
export function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export const inRange = (iso: string, start: Date, end: Date) => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
};
