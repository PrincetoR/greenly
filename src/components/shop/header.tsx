'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import type { Category } from '@/lib/types';

const NAV = [
  { href: '/products', label: 'สินค้าทั้งหมด' },
  { href: '/promotions', label: 'โปรโมชัน' },
] as const;

/**
 * หัวเว็บฝั่งลูกค้า — desktop: โลโก้ · เมนู · ช่องค้นหา · ตะกร้า
 * mobile: โลโก้ · ตะกร้า · ปุ่มเมนู → drawer ที่มีช่องค้นหา + เมนู + หมวดหมู่
 */
export function ShopHeader({
  storeName,
  categories,
  cartCount,
}: {
  storeName: string;
  categories: Category[];
  cartCount: number;
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
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand">
          <span aria-hidden>🌿</span>
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

        <div className="ml-auto hidden w-64 md:block">
          <SearchForm />
        </div>

        <Link
          href="/cart"
          aria-label={`ตะกร้า ${cartCount} ชิ้น`}
          className="relative ml-auto flex size-10 items-center justify-center rounded-lg text-xl hover:bg-surface-alt md:ml-0"
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-5 text-white">
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
          className="flex size-10 items-center justify-center rounded-lg text-xl hover:bg-surface-alt md:hidden"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* drawer มือถือ */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="border-t border-line bg-surface px-4 py-4 md:hidden"
      >
        <SearchForm autoFocus />
        <nav aria-label="เมนูหลัก (มือถือ)" className="mt-3 flex flex-col">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 font-medium hover:bg-surface-alt">
              {item.label}
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
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ค้นหาสินค้า…"
        aria-label="ค้นหาสินค้า"
        autoFocus={autoFocus}
        className="pl-9!"
      />
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden>
        🔍
      </span>
    </form>
  );
}
