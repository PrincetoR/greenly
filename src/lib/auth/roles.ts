import type { Role } from '@/lib/types';

/**
 * แกนของระบบสิทธิ์ — pure module (ห้าม import next/headers หรือ fs)
 * เพราะ proxy.ts, server component และ client component ใช้ร่วมกัน
 */
export const ROLES = ['admin', 'staff'] as const satisfies readonly Role[];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'พนักงาน',
};

export const PERMISSIONS = [
  'catalog.manage', // สินค้า + หมวดหมู่
  'order.manage', // ดู/เปลี่ยนสถานะคำสั่งซื้อ
  'promotion.manage',
  'user.manage',
  'settings.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** role เป็นแค่ชุดของ permission — เพิ่มตำแหน่งใหม่ = เพิ่ม entry ตรงนี้ */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  staff: ['catalog.manage', 'order.manage'],
};

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * เมนูหลังบ้าน = แหล่งความจริงเดียวของ "หน้าไหนต้องใช้สิทธิ์อะไร"
 * sidebar, proxy และ layout อ่านจากตรงนี้ทั้งหมด — เมนูที่เห็นกับหน้าที่เข้าได้จึงตรงกันเสมอ
 */
export interface AdminMenuItem {
  href: string;
  label: string;
  icon: string;
  /** null = ทุกคนที่ล็อกอินหลังบ้านได้ */
  permission: Permission | null;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { href: '/admin', label: 'แดชบอร์ด', icon: '📊', permission: null },
  { href: '/admin/products', label: 'สินค้า', icon: '📦', permission: 'catalog.manage' },
  { href: '/admin/categories', label: 'หมวดหมู่', icon: '🗂️', permission: 'catalog.manage' },
  { href: '/admin/promotions', label: 'โปรโมชัน', icon: '🏷️', permission: 'promotion.manage' },
  { href: '/admin/orders', label: 'คำสั่งซื้อ', icon: '🧾', permission: 'order.manage' },
  { href: '/admin/users', label: 'ผู้ใช้', icon: '👥', permission: 'user.manage' },
  { href: '/admin/settings', label: 'ตั้งค่าร้าน', icon: '⚙️', permission: 'settings.manage' },
];

export function visibleMenu(role: Role): AdminMenuItem[] {
  return ADMIN_MENU.filter((m) => m.permission === null || roleCan(role, m.permission));
}

/** หา item ที่คุม path นี้ — เลือก href ยาวสุดที่ตรง เพื่อให้ /admin/products/x ตกใต้ /admin/products */
export function menuItemForPath(pathname: string): AdminMenuItem | undefined {
  return ADMIN_MENU.filter((m) => pathname === m.href || pathname.startsWith(`${m.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** path ใต้ /admin ที่ไม่มีในเมนู = ปิดไว้ก่อน ปลอดภัยกว่าเปิดโดยลืม */
export function canAccessPath(role: Role, pathname: string): boolean {
  const item = menuItemForPath(pathname);
  if (!item) return false;
  return item.permission === null || roleCan(role, item.permission);
}
