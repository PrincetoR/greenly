import type { CategoryIconName } from '@/lib/types';

/** ไอคอนหมวดหมู่ที่เลือกได้ในฟอร์ม (ชื่อ + ป้ายไทย) — pure module */
export const CATEGORY_ICONS: { name: CategoryIconName; label: string }[] = [
  { name: 'cup-soda', label: 'เครื่องดื่ม' },
  { name: 'coffee', label: 'กาแฟ/ชา' },
  { name: 'wheat', label: 'ธัญพืช' },
  { name: 'cookie', label: 'ขนม' },
  { name: 'apple', label: 'ผลไม้' },
  { name: 'cherry', label: 'เบอร์รี่' },
  { name: 'carrot', label: 'ผัก' },
  { name: 'pill', label: 'อาหารเสริม' },
  { name: 'cooking-pot', label: 'ของใช้ในครัว' },
  { name: 'utensils', label: 'อาหาร' },
  { name: 'leaf', label: 'ธรรมชาติ' },
  { name: 'sparkles', label: 'ความงาม' },
  { name: 'heart', label: 'สุขภาพ' },
  { name: 'gift', label: 'ของขวัญ' },
  { name: 'shopping-bag', label: 'ทั่วไป' },
  { name: 'package', label: 'แพ็กเกจ' },
  { name: 'shirt', label: 'เสื้อผ้า' },
  { name: 'baby', label: 'แม่และเด็ก' },
  { name: 'dumbbell', label: 'ออกกำลังกาย' },
  { name: 'home', label: 'บ้าน' },
];
export const isCategoryIcon = (v: unknown): v is CategoryIconName => CATEGORY_ICONS.some((i) => i.name === v);
