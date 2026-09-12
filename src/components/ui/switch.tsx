'use client';

import { cn } from '@/lib/cn';

/** สวิตช์เปิด/ปิด — เป็น checkbox จริงเพื่อให้ส่งค่าใน FormData และเข้าถึงด้วยคีย์บอร์ดได้ */
export function Switch({
  checked,
  onChange,
  name,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center', className)}>
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="absolute inset-0 rounded-full bg-line transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}
