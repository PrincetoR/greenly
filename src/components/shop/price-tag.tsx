import { formatBaht } from '@/lib/money';
import { cn } from '@/lib/cn';

/** ราคาเดิมขีดฆ่า + ราคาโปร — ถ้าไม่มีส่วนลดแสดงราคาเดียว */
export function PriceTag({ price, original, size = 'md' }: { price: number; original: number; size?: 'md' | 'lg' }) {
  const discounted = price < original;
  const pct = discounted ? Math.round(((original - price) / original) * 100) : 0;
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2', size === 'lg' ? 'text-3xl' : 'text-base')}>
      <span className={cn('font-bold', discounted && 'text-accent')}>{formatBaht(price)}</span>
      {discounted && (
        <>
          <span className={cn('text-muted line-through', size === 'lg' ? 'text-lg' : 'text-xs')}>{formatBaht(original)}</span>
          {size === 'lg' && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-sm font-semibold text-accent">-{pct}%</span>}
        </>
      )}
    </p>
  );
}
