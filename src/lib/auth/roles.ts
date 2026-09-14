import type { Role } from '@/lib/types';

/**
 * แกนของระบบสิทธิ์ — pure module (ห้าม import next/headers หรือ fs)
 * เพราะ proxy.ts, server component และ client component ใช้ร่วมกัน
 */
export const ROLES = ['admin', 'staff', 'customer'] as const satisfies readonly Role[];

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  staff: 'พนักงาน',
  customer: 'ลูกค้า',
};

/** พนักงานร้าน (เข้าหลังบ้านได้) — ลูกค้าที่ login ไม่นับ */
export function isStaffRole(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'staff';
}

export const PERMISSIONS = [
  'catalog.manage', // สินค้า + หมวดหมู่
  'order.manage', // ดู/เปลี่ยนสถานะคำสั่งซื้อ
  'promotion.manage',
  'payment.manage', // ดู ledger Beam · คืนเงิน · ตั้งค่าช่องทาง
  'user.manage',
  'settings.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** role เป็นแค่ชุดของ permission — เพิ่มตำแหน่งใหม่ = เพิ่ม entry ตรงนี้ */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  staff: ['catalog.manage', 'order.manage'],
  customer: [],
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
export type AdminIconName = 'dashboard' | 'products' | 'categories' | 'promotions' | 'homepage' | 'orders' | 'shipping' | 'payments' | 'users' | 'settings';

export interface AdminMenuItem {
  href: string;
  label: string;
  /** ชื่อไอคอน — map เป็น component ใน components/admin/icons.tsx (ไฟล์นี้ต้อง pure ไม่ import React) */
  icon: AdminIconName;
  /** null = ทุกคนที่ล็อกอินหลังบ้านได้ */
  permission: Permission | null;
}

export const ADMIN_MENU: AdminMenuItem[] = [
  { href: '/admin', label: 'แดชบอร์ด', icon: 'dashboard', permission: null },
  { href: '/admin/products', label: 'สินค้า', icon: 'products', permission: 'catalog.manage' },
  { href: '/admin/categories', label: 'หมวดหมู่', icon: 'categories', permission: 'catalog.manage' },
  { href: '/admin/promotions', label: 'โปรโมชัน', icon: 'promotions', permission: 'promotion.manage' },
  // หน้าแรก = สไลด์แบนเนอร์ + ป๊อปอัปตอนเข้าเว็บ (เนื้อหาการตลาด) — ให้ admin เหมือนตั้งค่าร้าน
  { href: '/admin/homepage', label: 'หน้าแรก', icon: 'homepage', permission: 'settings.manage' },
  { href: '/admin/orders', label: 'คำสั่งซื้อ', icon: 'orders', permission: 'order.manage' },
  // จัดส่ง = มุมมองคลัง (คิวแพ็ค · ใบปะหน้า · เลขพัสดุ · ตีกลับ) แยกจากคำสั่งซื้อที่เป็นมุมมองบริการลูกค้า/การเงิน — ข้อมูลชุดเดียวกัน
  { href: '/admin/shipping', label: 'จัดส่ง', icon: 'shipping', permission: 'order.manage' },
  { href: '/admin/payments', label: 'การชำระเงิน', icon: 'payments', permission: 'payment.manage' },
  { href: '/admin/users', label: 'ผู้ใช้', icon: 'users', permission: 'user.manage' },
  { href: '/admin/settings', label: 'ตั้งค่าร้าน', icon: 'settings', permission: 'settings.manage' },
];

/** แดชบอร์ดคือ /admin ตรง ๆ ไม่งั้นทุกหน้าใต้ /admin จะ active พร้อมกัน */
export function isAdminMenuActive(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function visibleMenu(role: Role): AdminMenuItem[] {
  if (!isStaffRole(role)) return [];
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
  // ลูกค้าเข้าหลังบ้านไม่ได้เลย แม้แดชบอร์ดที่ permission = null
  if (!isStaffRole(role)) return false;
  const item = menuItemForPath(pathname);
  if (!item) return false;
  return item.permission === null || roleCan(role, item.permission);
}
