'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Heart, Leaf, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category } from '@/lib/types';

const NAV = [
  { href: '/products', label: 'สินค้าทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชัน' },
] as const;

/** ไอคอนมุมขวา เรียง wishlist · cart · profile — ทุกจอ */
const ACTIONS = [
  { href: '/wishlist', label: 'รายการโปรด', Icon: Heart, countKey: 'wishlist' },
  { href: '/cart', label: 'ตะกร้า', Icon: ShoppingCart, countKey: 'cart' },
  { href: '/orders', label: 'บัญชีของฉัน', Icon: User, countKey: null },
] as const;

/**
 * หัวเว็บฝั่งลูกค้า — desktop: โลโก้ · เมนู · ช่องค้นหา · ไอคอน 3 ตัว
 * mobile: โลโก้ · ไอคอน 3 ตัว · ปุ่มเมนู → drawer ที่มีช่องค้นหา + เมนู + หมวดหมู่
 */
export function ShopHeader({
  storeName,
  categories,
  cartCount,
  wishlistCount,
}: {
  storeName: string;
  categories: Category[];
  cartCount: number;
  wishlistCount: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // ปิด drawer ทุกครั้งที่เปลี่ยนหน้า — ปรับ state ระหว่าง render ตามแนวทาง React แทน useEffect
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }
  const counts = { wishlist: wishlistCount, cart: cartCount };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-brand">
          <Leaf className="size-5" aria-hidden />
          {storeName}
        </Link>

        <nav aria-label="เมนูหลัก" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href) ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-60 md:block">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center md:ml-0">
          {ACTIONS.map(({ href, label, Icon, countKey }) => {
            const count = countKey ? counts[countKey] : 0;
            const active = href === '/orders' ? pathname.startsWith('/order') : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={count > 0 ? `${label} ${count} รายการ` : label}
                title={label}
                className={cn('relative flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-alt', active ? 'text-brand' : 'text-ink')}
              >
                <Icon className="size-5" aria-hidden />
                {count > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}

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
        <SearchForm autoFocus />
        <nav aria-label="เมนูหลัก (มือถือ)" className="mt-3 flex flex-col">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-surface-alt">
              {item.label}
            </Link>
          ))}
          {ACTIONS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-medium hover:bg-surface-alt">
              <Icon className="size-4 text-muted" aria-hidden />
              {label}
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

/**
 * ช่องค้นหาในหัวเว็บ — ตั้งใจไม่อ่าน useSearchParams เพราะจะทำให้ header ทั้งก้อน
 * ถูก stream หลัง fallback (เห็นแถบว่างแวบหนึ่ง) · คำค้นปัจจุบันแสดงที่ช่องในหน้ารายการแทน
 */
function SearchForm({ autoFocus }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/products?q=${encodeURIComponent(term)}` : '/products');
  };

  return (
    <form role="search" onSubmit={submit} className="relative">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสินค้า…" aria-label="ค้นหาสินค้า" autoFocus={autoFocus} className="pl-9!" />
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </form>
  );
}
