import { Heart, Package, User } from 'lucide-react';

/** รายการเมนูบัญชี — ใช้ใน drawer มือถือ (desktop แสดงในแถบสถานะบนสุดแทน) */
export const ACCOUNT_ITEMS = [
  { href: '/account', label: 'โปรไฟล์', Icon: User },
  { href: '/wishlist', label: 'รายการโปรด', Icon: Heart },
  { href: '/orders', label: 'ประวัติการสั่งซื้อ', Icon: Package },
] as const;
