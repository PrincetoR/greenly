'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Heart, Menu, Package, ShoppingCart, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category } from '@/lib/types';
import { ACCOUNT_ITEMS } from './account-items';

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
 * แถบหลัก (sticky): โลโก้ · เมนู · ตะกร้า (ขวาสุด) · มือถือมีปุ่มเมนู → drawer รวมเมนูหลัก · บัญชี · หมวดหมู่
 */
export function ShopHeader({
  storeName,
  tagline,
  categories,
  cartCount,
  wishlistCount,
  isStaff = false,
  userName,
}: {
  storeName: string;
  tagline?: string;
  categories: Category[];
  cartCount: number;
  wishlistCount: number;
  /** login หลังบ้านอยู่ → แสดงเมนู "การจัดการ" */
  isStaff?: boolean;
  /** ชื่อ login หลังบ้าน (เช่น admin) · ไม่มี = guest */
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav: readonly NavItem[] = isStaff ? [...NAV, STAFF_NAV] : NAV;

  // ปิด drawer ทุกครั้งที่เปลี่ยนหน้า — ปรับ state ระหว่าง render ตามแนวทาง React แทน useEffect
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  return (
    <>
      {/* แถบสถานะ — ไม่ sticky (แถบหลักยังติดที่ top-0 ระยะ 65px ที่หน้ารายการใช้จึงไม่เปลี่ยน) */}
      {/* พื้นขาวต่อเนื่องกับแถบหลัก ไม่มีเส้นคั่น · ลิงก์สีเทา ชื่อผู้ใช้สีเข้ม */}
      <div className="status-bar hidden bg-surface text-xs text-muted md:block">
        {/* เว้นบน-ล่าง 2px — แถบสูง 24px */}
        <div className="mx-auto flex max-w-6xl items-end px-4 py-0.5 leading-5">
          {tagline && <p className="truncate">{tagline}</p>}
          <nav aria-label="แถบสถานะ" className="ml-auto flex items-center gap-4">
            <Link href="/wishlist" className="flex items-center gap-1 hover:text-ink">
              <Heart className="size-3.5" aria-hidden />
              รายการโปรด{wishlistCount > 0 && ` (${wishlistCount})`}
            </Link>
            <Link href="/orders" className="flex items-center gap-1 hover:text-ink">
              <Package className="size-3.5" aria-hidden />
              ประวัติการสั่งซื้อ
            </Link>
            <Link href="/account" className="flex items-center gap-1 font-medium text-ink hover:text-brand">
              <User className="size-3.5" aria-hidden />
              {userName ?? 'guest'}
            </Link>
          </nav>
        </div>
      </div>

    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        {/*
         * เส้นแนวตั้งร่วมกับหน้ารายการสินค้า (จอ md+):
         * กล่องซ้ายกว้าง = --aside-w และดันเมนูแรกไปชิดขวา → ขอบขวา "สินค้าทั้งหมด" = ขอบขวา card หมวดหมู่
         * เมนูถัดไปห่าง 4px + padding 12 → ข้อความ "โปรโมชัน" เริ่มตรงขอบซ้ายของการ์ดสินค้า/ช่องค้นหา
         * ทุกเมนูกว้างตามข้อความ padding ซ้าย-ขวาเท่ากัน · โลโก้ยาวเกินจะถูกตัด
         */}
        <nav aria-label="เมนูหลัก" className="flex min-w-0 items-center">
          <div className="flex min-w-0 items-center md:w-[var(--aside-w)] md:shrink-0 md:justify-between md:gap-2">
            {/* โลโก้ = ชื่อร้านตัวหนา สองโทน: 2 ตัวท้ายเป็นสี accent ("Green" เขียว + "ly" ส้ม) ให้ดูมีลูกเล่น */}
            <Link href="/" className="flex min-w-0 items-center text-3xl font-bold tracking-tight text-brand">
              <span className="truncate">
                {storeName.length > 3 ? (
                  <>
                    {storeName.slice(0, -2)}
                    <span className="text-accent">{storeName.slice(-2)}</span>
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
            className={cn('relative flex size-9 items-center justify-center', pathname.startsWith('/cart') ? 'text-brand' : 'text-ink')}
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
            className="flex size-9 items-center justify-center md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* drawer มือถือ */}
      <div id="mobile-menu" hidden={!open} className="border-t border-line bg-surface px-4 py-4 md:hidden">
        <nav aria-label="เมนูหลัก (มือถือ)" className="flex flex-col">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-surface-alt">
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="mt-3 px-3 text-xs font-semibold tracking-wide text-muted uppercase">บัญชี</p>
        <nav aria-label="เมนูบัญชี (มือถือ)" className="mt-1 flex flex-col">
          {ACCOUNT_ITEMS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium hover:bg-surface-alt">
              <Icon className="size-4 text-muted" aria-hidden />
              {label}
              {href === '/wishlist' && wishlistCount > 0 && <span className="ml-auto rounded-full bg-accent-soft px-2 text-xs font-semibold text-accent">{wishlistCount}</span>}
            </Link>
          ))}
        </nav>
        {categories.length > 0 && (
          <>
            <p className="mt-3 px-3 text-xs font-semibold tracking-wide text-muted uppercase">หมวดหมู่</p>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface-alt">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
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
