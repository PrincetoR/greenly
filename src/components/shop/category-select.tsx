'use client';

import { useRouter } from 'next/navigation';

/** หมวดหมู่บนมือถือ — dropdown แทนแถบข้าง (จอแคบเกินกว่าจะมีคอลัมน์ซ้าย) */
export function CategorySelect({ options, value }: { options: { href: string; label: string }[]; value: string }) {
  const router = useRouter();
  return (
    <select value={value} onChange={(e) => router.push(e.target.value)} aria-label="หมวดหมู่" className="h-10">
      {options.map((o) => (
        <option key={o.href} value={o.href}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
