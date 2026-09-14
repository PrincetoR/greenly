import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface CategoryLink {
  href: string;
  label: string;
  /** ตัวเลขชิดขวาแถวเดียวกับชื่อ (จำนวนสินค้า/โปรในหมวด) */
  count: number;
  active: boolean;
}

/**
 * card หมวดหมู่คอลัมน์ซ้าย (จอ md+) ใช้ร่วมกันระหว่างหน้ารายการสินค้าและหน้าโปรโมชัน (พี่ต่อสั่ง 2026-09-15 ให้โปรโมชันมีหมวดเหมือนกัน)
 * ขอบบน card ตรงกับช่องค้นหา · แถวแรกสูง 40 เท่าช่องค้นหา · เส้นคั่นที่ 40 · "ทั้งหมด" เริ่มที่ 56 = ขอบบนการ์ด — e2e/11 ตรวจทุกเส้น
 * sticky อยู่ที่ตัว aside (grid item) ไม่ใช่ลูกข้างใน
 */
export function CategoryAside({ title = 'หมวดหมู่สินค้า', links }: { title?: string; links: CategoryLink[] }) {
  return (
    <aside className="sticky top-[65px] hidden pt-4 md:block">
      <nav aria-label={title} className="rounded-card bg-surface p-2 pt-0 border border-line">
        {/* -mt-px ชดเชย border บน 1px ของ card: แถวสูง 40 เท่าช่องค้นหา กึ่งกลางตรงหัวข้อหน้า เส้นคั่นที่ 40 */}
        <p className="-mt-px flex h-10 items-center px-2 text-lg font-bold">{title}</p>
        {/* เส้นคั่นอยู่ที่ 40px = ขอบล่างช่องค้นหา · เว้น 15px ให้ "ทั้งหมด" เริ่มที่ 56 = ขอบบนการ์ด */}
        <div className="divider-caret mb-[15px] border-t border-line" aria-hidden />
        <ul className="flex flex-col">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={l.active ? 'page' : undefined}
                className={cn('flex items-center gap-2 rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors', l.active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt')}
              >
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                {/* จำนวนชิดขวาแถวเดียวกับชื่อ สีจางกว่าชื่อ (พี่ต่อสั่ง) */}
                <span className={cn('shrink-0 text-xs tabular-nums', l.active ? 'text-brand/80' : 'text-muted')}>{l.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
