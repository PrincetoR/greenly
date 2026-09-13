import { formatBaht } from '@/lib/money';
import { cn } from '@/lib/cn';

/**
 * ราคาเดิมขีดฆ่า + ราคาโปร — ถ้าไม่มีส่วนลดแสดงราคาเดียว
 * md (การ์ด): 2 บรรทัด ราคาเดิมขีดฆ่าบรรทัดบน ราคาโปรบรรทัดล่าง
 * lg (หน้าสินค้า): บรรทัดเดียว ราคาโปร · ราคาเดิม · ป้าย -%
 */
export function PriceTag({ price, original, size = 'md' }: { price: number; original: number; size?: 'md' | 'lg' }) {
  const discounted = price < original;
  const pct = discounted ? Math.round(((original - price) / original) * 100) : 0;

  if (size === 'lg') {
    return (
      <p className="flex flex-wrap items-baseline gap-x-2 text-3xl">
        <span className={cn('font-bold', discounted && 'text-accent')}>{formatBaht(price)}</span>
        {discounted && (
          <>
            <span className="text-lg text-muted line-through">{formatBaht(original)}</span>
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-sm font-semibold text-accent">-{pct}%</span>
          </>
        )}
      </p>
    );
  }

  return (
    <p className="flex flex-col leading-tight">
      {discounted && <span className="text-xs text-muted line-through">{formatBaht(original)}</span>}
      <span className={cn('text-base font-bold', discounted && 'text-accent')}>{formatBaht(price)}</span>
    </p>
  );
}
