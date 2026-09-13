'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Heart, Package, User } from 'lucide-react';
import { cn } from '@/lib/cn';

export const ACCOUNT_ITEMS = [
  { href: '/account', label: 'โปรไฟล์', Icon: User },
  { href: '/wishlist', label: 'รายการโปรด', Icon: Heart },
  { href: '/orders', label: 'ประวัติการสั่งซื้อ', Icon: Package },
] as const;

/**
 * ปุ่มบัญชี (รูปคน + ลูกศรลงเล็ก ๆ) → เมนู โปรไฟล์ · รายการโปรด · ประวัติการสั่งซื้อ
 * วางไว้ซ้ายของตะกร้า ให้ตะกร้าอยู่ขวาสุดเสมอ (จุดสามจุดหลังตะกร้าดูเหมือนไปกั้นตะกร้า)
 */
export function AccountMenu({ wishlistCount, className }: { wishlistCount: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ปิดเมื่อคลิกนอกเมนูหรือกด Esc — subscribe เฉพาะตอนเปิด
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูบัญชี"
        title="เมนูบัญชี"
        className={cn('flex h-10 items-center gap-0.5 rounded-lg pr-1.5 pl-2 transition-colors hover:bg-surface-alt', open && 'bg-surface-alt')}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-surface-alt text-ink" aria-hidden>
          <User className="size-4" />
        </span>
        <ChevronDown className={cn('size-3.5 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <div role="menu" aria-label="เมนูบัญชี" className="absolute top-full right-0 z-50 mt-1 w-56 overflow-hidden rounded-card bg-surface p-1.5 shadow-lg ring-1 ring-line">
          {ACCOUNT_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-surface-alt"
            >
              <Icon className="size-4 text-muted" aria-hidden />
              <span className="flex-1">{label}</span>
              {href === '/wishlist' && wishlistCount > 0 && <span className="rounded-full bg-accent-soft px-2 text-xs font-semibold text-accent">{wishlistCount}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
