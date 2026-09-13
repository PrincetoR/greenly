'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Leaf, Menu, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category } from '@/lib/types';
import { AccountMenu, ACCOUNT_ITEMS } from './account-menu';

const NAV = [
  { href: '/products', label: 'สินค้าทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชัน' },
] as const;
/** โผล่เฉพาะเมื่อ login หลังบ้านอยู่ (admin/staff) — layout ฝั่ง server เป็นคนตัดสิน */
const STAFF_NAV = { href: '/admin', label: 'การจัดการ' } as const;
type NavItem = (typeof NAV)[number] | typeof STAFF_NAV;

/**
 * หัวเว็บฝั่งลูกค้า — มุมขวา: [บัญชี ▾] [ตะกร้า] · ตะกร้าอยู่ขวาสุดเสมอ ไม่มีอะไรมากั้น
 * mobile: ตะกร้า + ปุ่มเมนู → drawer รวมค้นหา · เมนูหลัก · บัญชี · หมวดหมู่ (ปุ่มบัญชีซ่อนไว้)
 */
export function ShopHeader({
  storeName,
  categories,
  cartCount,
  wishlistCount,
  isStaff = false,
}: {
  storeName: string;
  categories: Category[];
  cartCount: number;
  wishlistCount: number;
  /** login หลังบ้านอยู่ → แสดงเมนู "การจัดการ" */
  isStaff?: boolean;
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
            <Link href="/" className="flex min-w-0 items-center gap-1 text-lg font-bold text-brand">
              <Leaf className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{storeName}</span>
            </Link>
            <NavLink item={NAV[0]} pathname={pathname} className="hidden shrink-0 md:block" />
          </div>
          <div className="ml-1 hidden items-center gap-1 md:flex">
            {nav.slice(1).map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </nav>

        {/* ไม่มีช่องค้นหาใน header (พี่ต่อไม่ชอบ) — ค้นหาได้ในหน้ารายการสินค้า */}
        <div className="ml-auto flex items-center gap-1">
          <AccountMenu wishlistCount={wishlistCount} className="hidden md:block" />
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `ตะกร้า ${cartCount} ชิ้น` : 'ตะกร้า'}
            title="ตะกร้า"
            className={cn('relative flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-alt', pathname.startsWith('/cart') ? 'text-brand' : 'text-ink')}
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
            className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-alt md:hidden"
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
