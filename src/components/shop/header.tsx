'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Leaf, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category } from '@/lib/types';
import { AccountMenu, ACCOUNT_ITEMS } from './account-menu';

const NAV = [
  { href: '/products', label: 'สินค้าทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชัน' },
] as const;

/**
 * หัวเว็บฝั่งลูกค้า — มุมขวา: [บัญชี ▾] [ตะกร้า] · ตะกร้าอยู่ขวาสุดเสมอ ไม่มีอะไรมากั้น
 * mobile: ตะกร้า + ปุ่มเมนู → drawer รวมค้นหา · เมนูหลัก · บัญชี · หมวดหมู่ (ปุ่มบัญชีซ่อนไว้)
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

        <div className="ml-auto hidden w-72 md:block lg:w-80">
          <SearchForm />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
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
        <SearchForm autoFocus />
        <nav aria-label="เมนูหลัก (มือถือ)" className="mt-3 flex flex-col">
          {NAV.map((item) => (
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

/**
 * ช่องค้นหาในหัวเว็บ — ทรง pill พื้นเทาอ่อนไม่มีขอบ ให้กลืนกับ header (ช่องขอบขาวดูแข็ง)
 * ตั้งใจไม่อ่าน useSearchParams เพราะจะทำให้ header ทั้งก้อนถูก stream หลัง fallback
 * · คำค้นปัจจุบันแสดงที่ช่องในหน้ารายการแทน
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
    <form role="search" onSubmit={submit} className="group/search relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted transition-colors group-focus-within/search:text-brand" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาสินค้า"
        aria-label="ค้นหาสินค้า"
        autoFocus={autoFocus}
        className="h-10 rounded-full! border-transparent! bg-surface-alt! pr-9! pl-10! text-sm placeholder:text-muted focus:bg-surface! focus:shadow-[0_0_0_2px_var(--brand-soft)]! [&::-webkit-search-cancel-button]:hidden"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ('')}
          aria-label="ล้างคำค้น"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </form>
  );
}
