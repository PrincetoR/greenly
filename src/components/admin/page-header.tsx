import type { ReactNode } from 'react';

/**
 * หัวหน้าหลังบ้าน — ชื่อ + คำอธิบาย + ปุ่ม action ด้านขวา (ตกลงมาอยู่ล่างบนจอแคบ)
 * h1 สูง 40 (leading-10) ให้กึ่งกลางตรงกับ "จัดการสินค้า" บรรทัดแรกของ card ซ้าย และเท่าปุ่ม action (h-10)
 */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl leading-10 font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}
