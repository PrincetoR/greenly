/** ตัวเลือกเรียงลำดับ — pure module ใช้ทั้ง server (page) และ client (toolbar) */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'price-asc', label: 'ราคาต่ำไปสูง' },
  { value: 'price-desc', label: 'ราคาสูงไปต่ำ' },
  // ไม่มี "ชื่อ ก–ฮ" — พี่ต่อให้เหลือ 3 ตัวเลือก (2026-09-15) · db ยังรองรับ sort 'name' ไว้ให้หลังบ้าน
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export function parseSort(value: unknown): SortValue {
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as SortValue) : 'newest';
}
