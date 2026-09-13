import Link from 'next/link';
import type { Category, Product, Promotion } from '@/lib/types';
import { describePromotion, shortDiscount } from '@/lib/promotions/describe';
import { PromoTypeIcon } from './promo-type-icon';
import { promotionStatus, type PromotionStatus } from '@/lib/pricing/status';
import type { PromotionUsageStats } from '@/lib/pricing/types';
import { humanCountdown, formatDateTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Countdown } from './countdown';

/** ลิงก์ที่พาไปดูสินค้าในโปร — หมวดเดียวใช้หน้าหมวด นอกนั้นใช้หน้ารวมกรองด้วย promo */
export function promoHref(promo: Promotion, categories: Category[]): string {
  if (promo.scope.kind === 'categories' && promo.scope.ids.length === 1) {
    const c = categories.find((c) => c.id === promo.scope.ids[0]);
    if (c) return `/category/${c.slug}`;
  }
  return `/products?promo=${promo.id}`;
}

export function PromoCard({
  promo,
  status,
  usage,
  categories,
  products,
  now,
}: {
  promo: Promotion;
  status: PromotionStatus;
  usage?: PromotionUsageStats;
  categories: Category[];
  products: Product[];
  now: Date;
}) {
  const names = { categories: new Map(categories.map((c) => [c.id, c.name])), products: new Map(products.map((p) => [p.id, p.name])) };
  const left = promo.limits.totalUses !== null ? Math.max(0, promo.limits.totalUses - (usage?.totalUses ?? 0)) : null;
  const live = status === 'live';

  return (
    <article className={cn('flex flex-col gap-3 rounded-card bg-surface p-5 border border-line', !live && 'opacity-80')}>
      <div className="flex items-start gap-3">
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', promo.type === 'bogo' ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent')} aria-hidden>
          <PromoTypeIcon type={promo.type} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{promo.name}</h3>
            {live ? <Badge tone="ok">กำลังใช้งาน</Badge> : <Badge tone="info">เร็ว ๆ นี้</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted">{describePromotion(promo, names)}</p>
        </div>
        <span className={cn('shrink-0 rounded-lg px-3 py-1.5 text-lg font-bold', promo.type === 'bogo' ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent')}>
          {shortDiscount(promo)}
        </span>
      </div>

      {promo.coupon && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-accent bg-accent-soft/50 px-3 py-2 text-sm">
          <span className="text-muted">ใช้โค้ด</span>
          <code className="rounded bg-surface px-2 py-0.5 font-mono text-base font-bold tracking-wider text-accent">{promo.coupon.code}</code>
          <span className="text-muted">ตอนชำระเงิน</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {live ? (
          <Countdown to={promo.endsAt} initial={humanCountdown(promo.endsAt, now)} />
        ) : (
          <Countdown to={promo.startsAt} initial={humanCountdown(promo.startsAt, now)} prefix="เริ่มใน" />
        )}
        <span>ถึง {formatDateTime(promo.endsAt)}</span>
        {left !== null && <span className={cn(left <= 5 && 'font-semibold text-accent')}>เหลือ {left} สิทธิ์</span>}
        {!promo.coupon && (
          <Link href={promoHref(promo, categories)} className="ml-auto font-semibold text-brand hover:underline">
            ดูสินค้าในโปร
          </Link>
        )}
      </div>
    </article>
  );
}

export { promotionStatus };
