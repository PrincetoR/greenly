import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { describePromotion, PROMOTION_TYPE_LABEL } from '@/lib/promotions/describe';
import { PromoTypeIcon } from '@/components/shop/promo-type-icon';
import { Plus, Tag } from 'lucide-react';
import { promotionStatus, PROMOTION_STATUS_LABEL, type PromotionStatus } from '@/lib/pricing/status';
import { formatDateTime, humanCountdown } from '@/lib/datetime';
import { duplicatePromotion, togglePromotionActive } from '@/lib/actions/promotions';
import { PageHeader } from '@/components/admin/page-header';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';

export const metadata = { title: 'โปรโมชัน' };

const TONE: Record<PromotionStatus, BadgeTone> = { live: 'ok', scheduled: 'info', ended: 'neutral', exhausted: 'warn', inactive: 'neutral' };
const ORDER: PromotionStatus[] = ['live', 'scheduled', 'exhausted', 'inactive', 'ended'];

export default async function PromotionsPage({ searchParams }: PageProps<'/admin/promotions'>) {
  await requirePermission('promotion.manage');
  const sp = await searchParams;
  const [{ promotions, usage, now }, categories, products] = await Promise.all([loadPromotionContext(), listCategories(), listProducts()]);
  const names = { categories: new Map(categories.map((c) => [c.id, c.name])), products: new Map(products.map((p) => [p.id, p.name])) };

  const rows = promotions
    .map((p) => ({ p, status: promotionStatus(p, now, usage[p.id]), u: usage[p.id] }))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || b.p.startsAt.localeCompare(a.p.startsAt));
  const filter = typeof sp.status === 'string' ? sp.status : '';
  const shown = filter ? rows.filter((r) => r.status === filter) : rows;
  const count = (s: PromotionStatus) => rows.filter((r) => r.status === s).length;

  return (
    <div>
      <PageHeader
        title="โปรโมชัน"
        description={`กำลังใช้งาน ${count('live')} · ยังไม่เริ่ม ${count('scheduled')} · ทั้งหมด ${rows.length}`}
        action={
          <Link href="/admin/promotions/new" className={buttonStyles()}>
            <Plus className="size-4" aria-hidden />
            สร้างโปรโมชัน
          </Link>
        }
      />
      {sp.saved && <Alert tone="ok" className="mb-4">บันทึกโปรโมชันแล้ว</Alert>}

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip href="/admin/promotions" active={!filter}>
          ทั้งหมด
        </FilterChip>
        {ORDER.map((s) => (
          <FilterChip key={s} href={`/admin/promotions?status=${s}`} active={filter === s}>
            {PROMOTION_STATUS_LABEL[s]} ({count(s)})
          </FilterChip>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Tag />}
          title="ยังไม่มีโปรโมชัน"
          description="สร้างโปรแรกได้ใน 1 นาที — ลดราคา คูปอง หรือซื้อแถม"
          action={
            <Link href="/admin/promotions/new" className={buttonStyles()}>
              สร้างโปรโมชัน
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map(({ p, status, u }) => (
            <li key={p.id} className={cn('rounded-card bg-surface p-4 border border-line', status === 'ended' && 'opacity-70')}>
              <div className="flex flex-wrap items-start gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', p.type === 'bogo' ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent')} aria-hidden>
                  <PromoTypeIcon type={p.type} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/promotions/${p.id}`} className="font-semibold hover:text-brand">
                      {p.name}
                    </Link>
                    <Badge tone={TONE[status]}>{PROMOTION_STATUS_LABEL[status]}</Badge>
                    <Badge>{PROMOTION_TYPE_LABEL[p.type]}</Badge>
                    {p.coupon && <Badge tone="accent" className="font-mono">{p.coupon.code}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{describePromotion(p, names)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateTime(p.startsAt)} ถึง {formatDateTime(p.endsAt)}
                    {status === 'live' && ` · เหลืออีก ${humanCountdown(p.endsAt, now)}`}
                    {status === 'scheduled' && ` · เริ่มใน ${humanCountdown(p.startsAt, now)}`}
                  </p>

                  {/* การใช้งาน */}
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                    <Usage label="ใช้ไป" used={u?.totalUses ?? 0} limit={p.limits.totalUses} unit="สิทธิ์" />
                    {p.limits.perProductQty !== null && (
                      <Usage
                        label="ชิ้นที่ได้โปร (สูงสุดต่อสินค้า)"
                        used={Math.max(0, ...Object.values(u?.perProduct ?? {}))}
                        limit={p.limits.perProductQty}
                        unit="ชิ้น"
                      />
                    )}
                    {p.limits.perCustomer !== null && <span className="text-muted">จำกัด {p.limits.perCustomer} ครั้ง/เบอร์</span>}
                  </div>
                </div>

                <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
                  <Link href={`/admin/promotions/${p.id}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    แก้ไข
                  </Link>
                  <form action={duplicatePromotion}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      ทำสำเนา
                    </Button>
                  </form>
                  <form action={togglePromotionActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant={p.active ? 'ghost' : 'primary'} size="sm">
                      {p.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </Button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors', active ? 'bg-brand text-white ring-brand' : 'bg-surface ring-line hover:bg-surface-alt')}>
      {children}
    </Link>
  );
}

function Usage({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  if (limit === null) {
    return (
      <span className="text-muted">
        {label} <b className="text-ink">{used}</b> {unit} (ไม่จำกัด)
      </span>
    );
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <span className="flex min-w-40 flex-col gap-1">
      <span className="text-muted">
        {label} <b className="text-ink">{used}</b>/{limit} {unit}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={used} aria-valuemax={limit} aria-label={label}>
        <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-warn' : 'bg-brand')} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}
