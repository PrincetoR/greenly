'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ROLE_LABEL, type AdminMenuItem } from '@/lib/auth/roles';
import { logout } from '@/lib/actions/auth';
import type { Session } from '@/lib/auth/session';
import { AdminIcon } from './icons';
import { Menu, Wrench, X } from 'lucide-react';

/**
 * เปลือกหลังบ้าน — รับเมนูที่กรองสิทธิ์มาแล้วจาก layout ฝั่ง server
 * ห้ามกรองสิทธิ์ตรงนี้ การตัดสินใจเรื่องสิทธิ์ต้องเกิดฝั่ง server เท่านั้น
 * desktop: sidebar ซ้ายตรึงไว้ · mobile: top bar + drawer ทับหน้าจอ
 */
export function AdminShell({
  items,
  session,
  storeName,
  children,
}: {
  items: AdminMenuItem[];
  session: Session;
  storeName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav aria-label="เมนูหลังบ้าน" className="flex flex-col gap-0.5 p-2">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-brand text-white' : 'text-ink hover:bg-surface-alt',
            )}
          >
            <AdminIcon name={item.icon} className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="border-t border-line p-3">
      <p className="truncate text-sm font-medium">{session.user.name}</p>
      <p className="text-xs text-muted">{ROLE_LABEL[session.role]}</p>
      <div className="mt-2 flex gap-1">
        <Link href="/" className="flex-1 rounded-lg px-2 py-1.5 text-center text-xs text-muted hover:bg-surface-alt">
          ดูหน้าร้าน
        </Link>
        <form action={logout} className="flex-1">
          <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-danger-soft hover:text-danger">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2 border-b border-line px-4 py-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand" aria-hidden>
            <Wrench className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{storeName}</p>
            <p className="text-xs text-muted">ระบบหลังบ้าน</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {userBox}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface px-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
            className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-alt"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <p className="flex items-center gap-2 font-bold">
            <Wrench className="size-4 text-brand" aria-hidden />
            {storeName}
          </p>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="เมนูหลังบ้าน">
          <button type="button" aria-label="ปิดเมนู" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="flex items-center gap-2 font-bold">
                <Wrench className="size-4 text-brand" aria-hidden />
                {storeName}
              </p>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิดเมนู" className="flex size-9 items-center justify-center rounded-lg hover:bg-surface-alt">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {userBox}
          </div>
        </div>
      )}
    </div>
  );
}
