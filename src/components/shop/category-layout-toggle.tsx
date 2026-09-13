'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { PanelLeft, Rows3 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type CategoryLayout = 'chips' | 'aside';
const COOKIE = 'ec_catlayout';

const OPTIONS: { value: CategoryLayout; label: string; Icon: typeof Rows3 }[] = [
  { value: 'chips', label: 'หมวดหมู่แบบแถบด้านบน', Icon: Rows3 },
  { value: 'aside', label: 'หมวดหมู่แบบแถบด้านข้าง', Icon: PanelLeft },
];

/**
 * สลับรูปแบบหมวดหมู่ (แถบบน ↔ แถบข้าง) — จำใน cookie 1 ปี แล้ว refresh ให้ server render แบบใหม่
 * แสดงเฉพาะจอ md ขึ้นไป เพราะมือถือใช้แถบบนเสมอ
 */
export function CategoryLayoutToggle({ current }: { current: CategoryLayout }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const pick = (value: CategoryLayout) => {
    if (value === current) return;
    document.cookie = `${COOKIE}=${value};path=/;max-age=31536000;samesite=lax`;
    start(() => router.refresh());
  };

  return (
    <div role="radiogroup" aria-label="รูปแบบการแสดงหมวดหมู่" className="hidden items-center rounded-lg bg-surface-alt p-0.5 md:inline-flex">
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = value === current;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            disabled={pending}
            onClick={() => pick(value)}
            className={cn('flex size-8 items-center justify-center rounded-md transition-colors', on ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink')}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
