'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { PromotionType, PromotionScope } from '@/lib/types';
import { formatDateTime } from '@/lib/datetime';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { PromoTypeIcon } from './promo-type-icon';
import { Countdown } from './countdown';

export interface PromoCardData {
  id: string;
  type: PromotionType;
  name: string;
  description: string;
  discount: string;
  live: boolean;
  startsAt: string;
  endsAt: string;
  countdownInitial: string | null;
  /** สิทธิ์คงเหลือ · null = ไม่จำกัด */
  left: number | null;
  couponCode: string | null;
  scopeKind: PromotionScope['kind'];
  scopeItems: { label: string; sub: string; href: string }[];
  conditions: string[];
  href: string;
}

/**
 * การ์ดโปรโมชันแบบย่อ (พี่ต่อสั่ง): ชื่อ 1 บรรทัดตัดด้วย … · บรรทัด 2 = สถานะ · คำอธิบาย 2 บรรทัดตัดด้วย … · แถวล่างเหมือนเดิม
 * กดทั้งการ์ด → ป๊อปอัปรายละเอียดเต็ม (ช่วงเวลา · นับถอยหลัง · สิทธิ์ · เงื่อนไข · โค้ด (ก๊อปได้) · สินค้า/หมวดในโปร · ปุ่มดูสินค้า)
 */
export function PromoCardView({ data: d }: { data: PromoCardData }) {
  const [open, setOpen] = useState(false);
  const accent = d.type === 'bogo' ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent';

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn('group card-hover flex h-full min-w-0 cursor-pointer flex-col gap-3 rounded-card bg-surface p-5 border border-line', !d.live && 'opacity-80')}
      >
        <div className="flex items-start gap-3">
          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', accent)} aria-hidden>
            <PromoTypeIcon type={d.type} className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate leading-6 font-bold transition-colors group-hover:text-brand" title={d.name}>
              {d.name}
            </h3>
            <div className="mt-0.5">{d.live ? <Badge tone="ok">กำลังใช้งาน</Badge> : <Badge tone="info">เร็ว ๆ นี้</Badge>}</div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{d.description}</p>
          </div>
          <span className={cn('shrink-0 rounded-lg px-3 py-1.5 text-lg font-bold', accent)}>{d.discount}</span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <Countdown to={d.live ? d.endsAt : d.startsAt} initial={d.countdownInitial} prefix={d.live ? 'เหลืออีก' : 'เริ่มใน'} />
          <span>ถึง {formatDateTime(d.endsAt)}</span>
          {d.left !== null && <span className={cn(d.left <= 5 && 'font-semibold text-accent')}>เหลือ {d.left} สิทธิ์</span>}
          {!d.couponCode && (
            <Link href={d.href} onClick={(e) => e.stopPropagation()} className="ml-auto font-semibold text-brand hover:underline">
              ดูสินค้าในโปร
            </Link>
          )}
        </div>
      </article>

      {open && <PromoDialog data={d} onClose={() => setOpen(false)} />}
    </>
  );
}

function PromoDialog({ data: d, onClose }: { data: PromoCardData; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const accent = d.type === 'bogo' ? 'bg-brand-soft text-brand' : 'bg-accent-soft text-accent';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const copy = async () => {
    if (!d.couponCode) return;
    try {
      await navigator.clipboard.writeText(d.couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-ink/60" />
      <div role="dialog" aria-modal="true" aria-labelledby={`promo-dialog-${d.id}`} className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col overflow-hidden rounded-card bg-surface shadow-xl">
        <button type="button" onClick={onClose} aria-label="ปิด" className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-surface-alt text-ink hover:bg-line">
          <X className="size-5" aria-hidden />
        </button>
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start gap-3 pr-10">
            <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', accent)} aria-hidden>
              <PromoTypeIcon type={d.type} className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={`promo-dialog-${d.id}`} className="text-lg font-bold leading-7">
                {d.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {d.live ? <Badge tone="ok">กำลังใช้งาน</Badge> : <Badge tone="info">เร็ว ๆ นี้</Badge>}
                <span className={cn('rounded-lg px-2.5 py-0.5 text-sm font-bold', accent)}>{d.discount}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6">{d.description}</p>

          {d.couponCode && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft/50 px-3 py-2 text-sm border border-dashed border-accent">
              <span className="text-muted">ใส่โค้ดที่หน้าตะกร้า</span>
              <code className="rounded bg-surface px-2 py-0.5 font-mono text-base font-bold tracking-wider text-accent">{d.couponCode}</code>
              <button type="button" onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink">
                {copied ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            </div>
          )}

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">ช่วงเวลา</dt>
              <dd>
                {formatDateTime(d.startsAt)} – {formatDateTime(d.endsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{d.live ? 'เวลาที่เหลือ' : 'เริ่มใน'}</dt>
              <dd>
                <Countdown to={d.live ? d.endsAt : d.startsAt} initial={d.countdownInitial} prefix="" />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">สิทธิ์คงเหลือ</dt>
              <dd className={cn(d.left !== null && d.left <= 5 && 'font-semibold text-accent')}>{d.left === null ? 'ไม่จำกัด' : `${d.left} สิทธิ์`}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">ใช้กับ</dt>
              <dd>{d.scopeKind === 'all' ? 'สินค้าทั้งร้าน' : d.scopeKind === 'categories' ? `หมวดหมู่ที่ร่วมรายการ (${d.scopeItems.length})` : `สินค้าที่ร่วมรายการ (${d.scopeItems.length})`}</dd>
            </div>
          </dl>

          {d.conditions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">เงื่อนไข</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {d.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {d.scopeItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{d.scopeKind === 'categories' ? 'หมวดหมู่ที่ร่วมรายการ' : 'สินค้าที่ร่วมรายการ'}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {d.scopeItems.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} className="card-hover inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-sm border border-line">
                      <span className="font-medium">{it.label}</span>
                      <span className="text-xs text-muted">{it.sub}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line p-4 sm:px-6">
          <Link href={d.href} className={buttonStyles()}>
            ดูสินค้าในโปร
          </Link>
          <button type="button" onClick={onClose} className={buttonStyles({ variant: 'secondary' })}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
