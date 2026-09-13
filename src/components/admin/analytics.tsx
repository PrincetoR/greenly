import Link from 'next/link';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatBaht } from '@/lib/money';
import { RANGES, type Range } from '@/lib/analytics/periods';
import type { SalesPoint } from '@/lib/analytics/sales';

/** ชิ้นส่วนสถิติของแดชบอร์ด — server component ล้วน ไม่มี state (เลือกช่วงผ่าน GET ?range=) */

/** สลับ รายวัน / รายเดือน / รายปี — เป็นลิงก์ ให้แชร์/กด back ได้เหมือนตัวกรองหน้าอื่น */
export function RangeTabs({ range }: { range: Range }) {
  return (
    <nav aria-label="ช่วงเวลา" className="inline-flex rounded-lg bg-surface-alt p-0.5">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={r.value === 'day' ? '/admin' : `/admin?range=${r.value}`}
          aria-current={r.value === range ? 'page' : undefined}
          title={r.hint}
          className={cn('rounded-md px-3 py-1 text-sm font-medium transition-colors', r.value === range ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink')}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

/** % เทียบช่วงก่อนหน้า — เขียวขึ้น แดงลง เทาเท่าเดิม · null = ช่วงก่อนไม่มีข้อมูล */
export function Delta({ value, label = 'เทียบช่วงก่อน', className }: { value: number | null; label?: string; className?: string }) {
  if (value === null) return <span className={cn('text-xs text-muted', className)}>ไม่มีข้อมูลช่วงก่อน</span>;
  const rounded = Math.round(value * 10) / 10;
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', rounded > 0 ? 'text-ok' : rounded < 0 ? 'text-danger' : 'text-muted', className)}>
      <Icon className="size-3.5" aria-hidden />
      {rounded > 0 ? '+' : ''}
      {rounded.toLocaleString('th-TH', { maximumFractionDigits: 1 })}%<span className="font-normal text-muted"> {label}</span>
    </span>
  );
}

export function Stat({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
      {delta !== undefined && <Delta value={delta} className="mt-0.5" />}
    </div>
  );
}

/** ปัดเพดานแกน Y ขึ้นเป็นเลขกลม ๆ (1 / 1.5 / 2 / 3 / 5 … × 10^n) ให้แท่งสูงสุดใกล้เพดาน ไม่เหลือที่ว่างครึ่งกราฟ */
function niceCeil(satang: number): number {
  if (satang <= 0) return 100_00;
  const mag = 10 ** Math.floor(Math.log10(satang));
  const n = satang / mag;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) ?? 10;
  return step * mag;
}

/**
 * กราฟแท่งเป็น HTML ล้วน (ไม่ใช่ SVG) ให้ยืดตามความกว้างจอโดยตัวหนังสือไม่ย่อตาม
 * แท่งสุดท้าย = ช่วงปัจจุบัน เข้มกว่าเพื่อน · hover ดูตัวเลขจาก title
 */
export function BarChart({ points, labelEvery = 1 }: { points: SalesPoint[]; labelEvery?: number }) {
  const max = niceCeil(Math.max(...points.map((p) => p.revenue)));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const showLabel = (i: number) => (points.length - 1 - i) % labelEvery === 0;
  // จอแคบเหลือป้ายครึ่งเดียว (ทุก 2 ช่วงของ labelEvery) ไม่งั้นตัวหนังสือทับกัน
  const sparse = (i: number) => (points.length - 1 - i) % (labelEvery * 2) === 0;
  return (
    <figure>
      <div className="flex gap-3">
        <div className="flex h-52 w-16 shrink-0 flex-col justify-between text-right text-[11px] leading-none text-muted">
          {ticks.map((t) => (
            <span key={t}>{formatBaht(max * t)}</span>
          ))}
        </div>
        <div className="relative h-52 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${(1 - t) * 100}%` }} aria-hidden />
          ))}
          <ul className="absolute inset-0 flex items-end gap-[3px]" aria-label="ยอดขายต่อช่วง">
            {points.map((p, i) => (
              <li key={p.key} className="flex h-full flex-1 items-end" title={`${p.label} · ${formatBaht(p.revenue)} · ${p.orders} ออเดอร์`}>
                <div className={cn('w-full bg-brand', i < points.length - 1 && 'opacity-55')} style={{ height: `${Math.max(p.revenue > 0 ? 1 : 0, (p.revenue / max) * 100)}%` }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* ช่องป้ายแคบกว่าข้อความ (รายวัน 30 ช่อง) — ให้ล้นออกมาได้ เพราะช่องข้าง ๆ ว่างอยู่แล้ว */}
      <ul className="mt-1.5 ml-19 flex gap-[3px] text-[11px] leading-none text-muted" aria-hidden>
        {points.map((p, i) => (
          // ป้ายแรก/สุดท้ายชิดขอบ ไม่งั้นล้นออกนอกกราฟ (จอแคบ) จนหน้าเลื่อนข้างได้
          <li key={p.key} className={cn('flex min-w-0 flex-1', i === 0 ? 'justify-start' : i === points.length - 1 ? 'justify-end' : 'justify-center')}>
            {showLabel(i) && <span className={cn('whitespace-nowrap', labelEvery > 1 && !sparse(i) && 'hidden sm:inline')}>{p.label}</span>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
