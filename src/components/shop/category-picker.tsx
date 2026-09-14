'use client';

import { useRouter } from 'next/navigation';
import { Select, type SelectOption } from '@/components/ui/select';

/** dropdown หมวดหมู่บนมือถือ (หน้าโปรโมชัน) — ค่า = href เลือกแล้วนำทางไปเลย */
export function CategoryPicker({ options, value }: { options: SelectOption[]; value: string }) {
  const router = useRouter();
  return <Select size="bar" aria-label="หมวดหมู่" options={options} value={value} onChange={(href) => router.push(href)} />;
}
