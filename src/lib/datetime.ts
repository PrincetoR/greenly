/**
 * เวลาเก็บเป็น ISO (UTC) · แสดง/กรอกเป็นเวลาไทยเสมอ
 * pure module ใช้ได้ทั้ง server และ client
 */
export const TZ = 'Asia/Bangkok';

const dateFmt = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: '2-digit' });
const dateTimeFmt = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export const formatDate = (iso: string | Date) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string | Date) => dateTimeFmt.format(new Date(iso));
export const formatTime = (iso: string | Date) => timeFmt.format(new Date(iso));

/** "11 ก.ย. – 26 ก.ย. 69" · ถ้าวันเดียวกันแสดงเวลาแทน */
export function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (formatDate(s) === formatDate(e)) return `${formatDate(s)} ${formatTime(s)}–${formatTime(e)}`;
  return `${formatDate(s)} – ${formatDate(e)}`;
}

/** ส่วนประกอบของเวลาไทยจาก Date — ใช้ทำค่า datetime-local โดยไม่พึ่ง timezone ของเครื่อง */
function bangkokParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') === '24' ? '00' : get('hour'), mi: get('minute') };
}

/** ISO → "2026-09-12T17:00" (เวลาไทย) สำหรับ <input type="datetime-local"> */
export function toDatetimeLocal(iso: string | Date): string {
  const { y, m, d, h, mi } = bangkokParts(new Date(iso));
  return `${y}-${m}-${d}T${h}:${mi}`;
}

/** "2026-09-12T17:00" (เวลาไทย) → ISO · คืน null ถ้ารูปแบบผิด */
export function fromDatetimeLocal(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  // ไทยไม่มี DST → +07:00 คงที่ ใส่ offset ตรง ๆ ได้
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** นับถอยหลังแบบอ่านง่าย: "2 วัน 3 ชม." / "45 นาที" · null ถ้าผ่านไปแล้ว */
export function humanCountdown(toIso: string, now: Date): string | null {
  let sec = Math.floor((new Date(toIso).getTime() - now.getTime()) / 1000);
  if (sec <= 0) return null;
  const d = Math.floor(sec / 86400);
  sec -= d * 86400;
  const h = Math.floor(sec / 3600);
  sec -= h * 3600;
  const mi = Math.floor(sec / 60);
  if (d > 0) return `${d} วัน ${h} ชม.`;
  if (h > 0) return `${h} ชม. ${mi} นาที`;
  return `${Math.max(mi, 1)} นาที`;
}

/** "3 ชม." / "2 วัน" / "5 นาที" ที่ผ่านมา — ใช้บอกว่าออเดอร์ค้างในคิวนานแค่ไหน */
export function timeAgo(iso: string, now: Date): string {
  const min = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${Math.max(min, 1)} นาที`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ชม.`;
  const d = Math.floor(h / 24);
  return `${d} วัน${h % 24 ? ` ${h % 24} ชม.` : ''}`;
}
