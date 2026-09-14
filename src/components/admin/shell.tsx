'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { ROLE_LABEL, isAdminMenuActive, type AdminMenuItem } from '@/lib/auth/roles';
import { logout } from '@/lib/actions/auth';
import type { Session } from '@/lib/auth/session';

/**
 * เปลือกหลังบ้าน — รับเมนูที่กรองสิทธิ์มาแล้วจาก layout ฝั่ง server
 * ห้ามกรองสิทธิ์ตรงนี้ การตัดสินใจเรื่องสิทธิ์ต้องเกิดฝั่ง server เท่านั้น
 * โครงเดียวกับหน้ารายการสินค้า: คอลัมน์ซ้าย --aside-w เป็น card "จัดการสินค้า" (หัว 40 · เส้นคั่นมีหัวลูกศร · รายการ)
 * ติดใต้ header ตอนเลื่อนเหมือน card หมวดหมู่ · มือถือไม่มีคอลัมน์ซ้าย เมนูอยู่ใน drawer ของ header แทน
 */
export function AdminShell({ items, session, children }: { items: AdminMenuItem[]; session: Session; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 md:grid md:grid-cols-[var(--aside-w)_1fr] md:items-start md:gap-4">
      <aside className="sticky top-[65px] hidden pt-4 md:block">
        {/* ขนาด/ระยะทุกอย่างเท่า card หมวดหมู่สินค้า (product-listing.tsx) — ถ้าแก้ที่นั่นต้องแก้ที่นี่ด้วย */}
        <nav aria-label="เมนูหลังบ้าน" className="rounded-card bg-surface p-2 pt-0 border border-line">
          <p className="-mt-px flex h-10 items-center px-2 text-lg font-bold">จัดการสินค้า</p>
          <div className="divider-caret mb-[15px] border-t border-line" aria-hidden />
          <ul className="flex flex-col">
            {items.map((item) => {
              const active = isAdminMenuActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('block rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors', active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt')}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ผู้ใช้ที่ login อยู่ + ออกจากระบบ — แยกเป็น card ของตัวเองให้ card เมนูเหมือนหมวดหมู่สินค้าเป๊ะ */}
        <div className="mt-3 rounded-card bg-surface p-3 border border-line">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[session.role]}</p>
          <form action={logout} className="mt-2">
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-xs text-muted border border-line hover:bg-danger-soft hover:text-danger">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* เนื้อหาเริ่มที่ 16px ใต้ header เท่าขอบบน card ซ้าย */}
      <div className="min-w-0 pt-4">{children}</div>
    </div>
  );
}
