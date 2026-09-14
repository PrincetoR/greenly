'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Heart, Menu, Package, ShoppingCart, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isAdminMenuActive, type AdminMenuItem } from '@/lib/auth/roles';
import { logout } from '@/lib/actions/auth';
import { TopLine } from './top-line';

const NAV = [
  { href: '/products', label: 'สินค้าทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชัน' },
] as const;
/** โผล่เฉพาะเมื่อ login หลังบ้านอยู่ (admin/staff) — layout ฝั่ง server เป็นคนตัดสิน */
const STAFF_NAV = { href: '/admin', label: 'การจัดการ' } as const;
type NavItem = (typeof NAV)[number] | typeof STAFF_NAV;

/**
 * หัวเว็บฝั่งลูกค้า
 * แถบสถานะบนสุด (แบบ Shopee, จอ md+): ขวา = รายการโปรด · ประวัติการสั่งซื้อ · ชื่อผู้ใช้ (หรือ guest) — เลื่อนไปกับหน้า
 * แถบหลัก (sticky): โลโก้ · เมนู · ตะกร้า (ขวาสุด)
 * มือถือ (พี่ต่อสั่ง 2026-09-15): หน้าร้าน = ตะกร้าอย่างเดียว (นำทางด้วยแถบเมนูล่าง MobileTabBar) · หน้าหลังบ้าน = ปุ่มเมนู (hamburger) อย่างเดียว ไม่มีตะกร้า
 * → drawer มือถือจึงเปิดได้เฉพาะหลังบ้าน และมีแค่เมนูหลังบ้าน + ออกจากระบบ (ไม่มีเมนูหน้าร้าน/บัญชี/หมวดหมู่ — แถบเมนูล่างทำหน้าที่แทน)
 * หลังบ้านใช้ header ตัวนี้ด้วย — เมนู "การจัดการ" active และเส้นแนวตั้งตรงกับ card เมนูหลังบ้าน
 */
export function ShopHeader({
  storeName,
  tagline,
  cartCount,
  wishlistCount,
  isStaff = false,
  userName,
  adminItems,
}: {
  storeName: string;
  tagline?: string;
  cartCount: number;
  wishlistCount: number;
  /** login หลังบ้านอยู่ → แสดงเมนู "การจัดการ" */
  isStaff?: boolean;
  /** ชื่อ login หลังบ้าน (เช่น admin) · ไม่มี = guest */
  userName?: string | null;
  /** หน้าหลังบ้านส่งเมนู (กรองสิทธิ์แล้ว) มาใส่ drawer มือถือ — จอใหญ่เมนูอยู่ใน card ซ้ายของ AdminShell */
  adminItems?: AdminMenuItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav: readonly NavItem[] = isStaff ? [...NAV, STAFF_NAV] : NAV;
  // อยู่หน้าหลังบ้าน (layout admin ส่งเมนูมา) → มือถือโชว์ hamburger แทนตะกร้า
  const onAdmin = Boolean(adminItems);

  // ปิด drawer ทุกครั้งที่เปลี่ยนหน้า — ปรับ state ระหว่าง render ตามแนวทาง React แทน useEffect
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* เส้นเขียว 2px ตรึงบนสุด + วิ่งตอนโหลดหน้า — กลืนกับแถบสถานะตอนอยู่บนสุด */}
      <TopLine />
      {/* แถบสถานะ — ไม่ sticky (แถบหลักยังติดที่ top-0 ระยะ 65px ที่หน้ารายการใช้จึงไม่เปลี่ยน) */}
      {/* พื้นสีแบรนด์แบบ Shopee · ลิงก์ขาวโปร่ง ชื่อผู้ใช้ขาวเข้ม */}
      <div className="status-bar hidden bg-brand text-xs text-white/85 md:block">
        {/* เว้นบน-ล่าง 2px — แถบสูง 24px */}
        <div className="mx-auto flex max-w-6xl items-end px-4 py-0.5 leading-5">
          {tagline && <p className="truncate">{tagline}</p>}
          <nav aria-label="แถบสถานะ" className="ml-auto flex items-center gap-4">
            <Link href="/wishlist" className="flex items-center gap-1 hover:text-white">
              <Heart className="size-3.5" aria-hidden />
              รายการโปรด{wishlistCount > 0 && ` (${wishlistCount})`}
            </Link>
            <Link href="/orders" className="flex items-center gap-1 hover:text-white">
              <Package className="size-3.5" aria-hidden />
              ประวัติการสั่งซื้อ
            </Link>
            <Link href="/account" className="flex items-center gap-1 font-medium text-white">
              <User className="size-3.5" aria-hidden />
              {userName ?? 'guest'}
            </Link>
          </nav>
        </div>
      </div>

    {/* พื้นทึบ ไม่ใช้ backdrop-blur — ตอนแบนเนอร์ใหญ่เลื่อนมุดใต้ header การเบลอต้องคำนวณใหม่ทุกเฟรม ทำให้กระตุก (พี่ต่อเห็นตอน snap ไปหมวดหมู่) */}
    <header className="site-header sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        {/*
         * เส้นแนวตั้งร่วมกับหน้ารายการสินค้า (จอ md+):
         * กล่องซ้ายกว้าง = --aside-w และดันเมนูแรกไปชิดขวา → ขอบขวา "สินค้าทั้งหมด" = ขอบขวา card หมวดหมู่
         * เมนูถัดไปห่าง 4px + padding 12 → ข้อความ "โปรโมชัน" เริ่มตรงขอบซ้ายของการ์ดสินค้า/ช่องค้นหา
         * ทุกเมนูกว้างตามข้อความ padding ซ้าย-ขวาเท่ากัน · โลโก้ยาวเกินจะถูกตัด
         */}
        <nav aria-label="เมนูหลัก" className="flex min-w-0 items-center">
          <div className="flex min-w-0 items-center md:w-[var(--aside-w)] md:shrink-0 md:justify-between md:gap-2">
            {/* โลโก้ = ชื่อร้านตัวหนา สองโทน: 2 ตัวท้ายเป็นสีทอง ("Green" เขียว + "ly" ทอง) ให้ดูมีลูกเล่น */}
            <Link href="/" className="flex min-w-0 items-center text-3xl font-bold tracking-tight text-brand">
              <span className="truncate">
                {storeName.length > 3 ? (
                  <>
                    {storeName.slice(0, -2)}
                    <span className="text-logo-accent">{storeName.slice(-2)}</span>
                  </>
                ) : (
                  storeName
                )}
              </span>
            </Link>
            <NavLink item={NAV[0]} pathname={pathname} className="hidden shrink-0 md:block" />
          </div>
          <div className="ml-1 hidden items-center gap-1 md:flex">
            {nav.slice(1).map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </nav>

        {/* ไม่มีช่องค้นหาใน header (พี่ต่อไม่ชอบ) — ค้นหาได้ในหน้ารายการสินค้า · ไม่มี hover effect */}
        <div className="ml-auto flex items-center">
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `ตะกร้า ${cartCount} ชิ้น` : 'ตะกร้า'}
            title="ตะกร้า"
            className={cn('relative size-9 items-center justify-center', onAdmin ? 'hidden md:flex' : 'flex', pathname.startsWith('/cart') ? 'text-brand' : 'text-ink')}
          >
            <ShoppingCart className="size-5" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
            className={cn('size-9 items-center justify-center md:hidden', onAdmin ? 'flex' : 'hidden')}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* drawer มือถือ — เปิดได้เฉพาะหลังบ้าน: เมนูหลังบ้าน (แดชบอร์ด … ตั้งค่าร้าน) + ออกจากระบบ เท่านั้น ไม่มีหัวข้อ/เมนูหน้าร้าน (พี่ต่อสั่ง 2026-09-15) */}
      {adminItems && (
        <div id="mobile-menu" hidden={!open} className="border-t border-line bg-surface px-4 py-4 md:hidden">
          <nav aria-label="เมนูหลังบ้าน (มือถือ)" className="flex flex-col">
            {adminItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isAdminMenuActive(href, pathname) ? 'page' : undefined}
                className={cn('rounded-lg px-3 py-2.5 font-medium', isAdminMenuActive(href, pathname) ? 'bg-brand-soft text-brand' : 'hover:bg-surface-alt')}
              >
                {label}
              </Link>
            ))}
            <form action={logout}>
              <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-left font-medium text-danger hover:bg-danger-soft">
                ออกจากระบบ
              </button>
            </form>
          </nav>
        </div>
      )}
    </header>
    </>
  );
}

function NavLink({ item, pathname, className }: { item: NavItem; pathname: string; className?: string }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        pathname.startsWith(item.href) ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt',
        className,
      )}
    >
      {item.label}
    </Link>
  );
}
