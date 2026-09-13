'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { savePromotion } from '@/lib/actions/promotions';
import { cn } from '@/lib/cn';
import { formatBaht, satangToInput, toSatang } from '@/lib/money';
import { toDatetimeLocal, fromDatetimeLocal, humanCountdown } from '@/lib/datetime';
import { describePromotion } from '@/lib/promotions/describe';
import { PromoTypeIcon } from '@/components/shop/promo-type-icon';
import { ArrowRight } from 'lucide-react';
import { promotionStatus, PROMOTION_STATUS_LABEL } from '@/lib/pricing/status';
import type { FormState } from '@/lib/validation/common';
import type { Category, Product, Promotion, PromotionType } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ProductPicker } from './product-picker';

/* ---------- ตัวเลือกประเภท ---------- */
const TYPES: { value: PromotionType; title: string; desc: string }[] = [
  { value: 'discount', title: 'ลดราคา', desc: 'ลดเป็น % หรือบาท ราคาโปรขึ้นหน้าร้านอัตโนมัติ' },
  { value: 'coupon', title: 'คูปองโค้ด', desc: 'ลูกค้ากรอกโค้ดตอนชำระเงิน ลดยอดหรือส่งฟรี' },
  { value: 'bogo', title: 'ซื้อ X แถม Y', desc: 'ซื้อครบจำนวนที่กำหนด แถมสินค้าชิ้นเดียวกันฟรี' },
];

const STATUS_TONE: Record<ReturnType<typeof promotionStatus>, BadgeTone> = {
  live: 'ok',
  scheduled: 'info',
  ended: 'neutral',
  exhausted: 'warn',
  inactive: 'neutral',
};

interface Limit {
  on: boolean;
  value: string;
}

function initialState(p: Promotion | undefined, now: Date) {
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  return {
    type: p?.type ?? ('discount' as PromotionType),
    name: p?.name ?? '',
    active: p?.active ?? true,
    startsAt: toDatetimeLocal(p?.startsAt ?? now),
    endsAt: toDatetimeLocal(p?.endsAt ?? in7),
    scopeKind: p?.scope.kind ?? ('all' as Promotion['scope']['kind']),
    scopeIds: p?.scope.ids ?? [],
    discountMode: p?.discount?.mode ?? ('percent' as 'percent' | 'fixed'),
    discountValue: p?.discount ? (p.discount.mode === 'percent' ? String(p.discount.value) : satangToInput(p.discount.value)) : '',
    couponCode: p?.coupon?.code ?? '',
    couponMinSubtotal: p?.coupon?.minSubtotal != null ? satangToInput(p.coupon.minSubtotal) : '',
    couponFreeShipping: p?.coupon?.freeShipping ?? false,
    bogoBuy: p?.bogo ? String(p.bogo.buyQty) : '2',
    bogoGet: p?.bogo ? String(p.bogo.getQty) : '1',
    limitTotal: { on: p?.limits.totalUses != null, value: String(p?.limits.totalUses ?? 100) } as Limit,
    limitPerProduct: { on: p?.limits.perProductQty != null, value: String(p?.limits.perProductQty ?? 10) } as Limit,
    limitPerCustomer: { on: p?.limits.perCustomer != null, value: String(p?.limits.perCustomer ?? 1) } as Limit,
  };
}

/**
 * ฟอร์มโปรโมชัน — หน้าเดียว ไล่บนลงล่าง โชว์เฉพาะช่องของประเภทที่เลือก
 * ค่าที่กรอกทั้งหมดถูกส่งเป็น FormData ธรรมดา (hidden input สำหรับ state ที่ไม่ใช่ input ตรง ๆ)
 */
export function PromotionForm({
  promotion,
  categories,
  products,
  serverNow,
}: {
  promotion?: Promotion;
  categories: Category[];
  products: Product[];
  /** เวลาจาก server — ใช้เป็นค่าเริ่มต้นและคำนวณสถานะ เพื่อให้ HTML ฝั่ง server กับ client ตรงกันตอน hydrate */
  serverNow: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePromotion, {});
  const now = useMemo(() => new Date(serverNow), [serverNow]);
  const [f, setF] = useState(() => initialState(promotion, now));
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }));
  const errors = state.errors ?? {};

  const names = useMemo(
    () => ({ categories: new Map(categories.map((c) => [c.id, c.name])), products: new Map(products.map((p) => [p.id, p.name])) }),
    [categories, products],
  );

  /* preview object สำหรับสรุป/สถานะ — ค่าที่ยังกรอกไม่ครบก็แสดงได้ */
  const preview = useMemo(() => {
    const value = Number(f.discountValue);
    const discount = f.type === 'bogo' || !f.discountValue ? null : { mode: f.discountMode, value: f.discountMode === 'percent' ? value : toSatang(value) };
    return {
      type: f.type,
      active: f.active,
      startsAt: fromDatetimeLocal(f.startsAt) ?? '',
      endsAt: fromDatetimeLocal(f.endsAt) ?? '',
      scope: { kind: f.scopeKind, ids: f.scopeKind === 'all' ? [] : f.scopeIds },
      discount,
      coupon: f.type === 'coupon' ? { code: f.couponCode, minSubtotal: f.couponMinSubtotal ? toSatang(f.couponMinSubtotal) : null, freeShipping: f.couponFreeShipping } : null,
      bogo: f.type === 'bogo' ? { buyQty: Number(f.bogoBuy) || 0, getQty: Number(f.bogoGet) || 0 } : null,
      limits: {
        totalUses: f.limitTotal.on ? Number(f.limitTotal.value) || null : null,
        perProductQty: f.limitPerProduct.on ? Number(f.limitPerProduct.value) || null : null,
        perCustomer: f.limitPerCustomer.on ? Number(f.limitPerCustomer.value) || null : null,
      },
    };
  }, [f]);

  const status = preview.startsAt && preview.endsAt ? promotionStatus({ ...preview, id: '', name: '', createdAt: '', updatedAt: '' }, now) : null;
  const summary = describePromotion(preview, names);

  /* ตัวอย่างราคาสด — ใช้สินค้าตัวแรกที่เข้า scope */
  const sample = useMemo(() => {
    const inScope = products.find((p) =>
      preview.scope.kind === 'all' ? true : preview.scope.kind === 'categories' ? preview.scope.ids.includes(p.categoryId) : preview.scope.ids.includes(p.id),
    );
    return inScope ?? products[0];
  }, [products, preview.scope]);

  const examplePrice = (() => {
    if (!sample || !preview.discount || preview.discount.value <= 0) return null;
    const cut = preview.discount.mode === 'percent' ? Math.round((sample.price * preview.discount.value) / 100) : Math.min(preview.discount.value, sample.price);
    return { name: sample.name, before: sample.price, after: sample.price - cut };
  })();

  const shiftEnd = (days: number) => {
    const start = new Date(fromDatetimeLocal(f.startsAt) ?? Date.now());
    set('endsAt', toDatetimeLocal(new Date(start.getTime() + days * 86_400_000)));
  };
  const endOfMonth = () => {
    const start = new Date(fromDatetimeLocal(f.startsAt) ?? Date.now());
    // วันสุดท้ายของเดือน 23:59 เวลาไทย
    const bkk = new Date(start.getTime() + 7 * 3600_000);
    const last = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth() + 1, 0, 23, 59) - 7 * 3600_000);
    set('endsAt', toDatetimeLocal(last));
  };

  return (
    <form action={action} className="pb-36 md:pb-28">
      {promotion && <input type="hidden" name="id" value={promotion.id} />}
      <input type="hidden" name="type" value={f.type} />
      <input type="hidden" name="scopeKind" value={f.scopeKind} />
      {f.scopeKind !== 'all' && f.scopeIds.map((id) => <input key={id} type="hidden" name="scopeIds" value={id} />)}
      <input type="hidden" name="discountMode" value={f.discountMode} />
      {f.active && <input type="hidden" name="active" value="on" />}

      {state.message && (
        <Alert tone="danger" className="mb-4">
          {state.message}
        </Alert>
      )}

      <div className="flex flex-col gap-5">
        {/* 1. ประเภท */}
        <Step n={1} title="เลือกประเภทโปรโมชัน">
          <div role="radiogroup" aria-label="ประเภทโปรโมชัน" className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => {
              const on = f.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set('type', t.value)}
                  className={cn(
                    'rounded-card p-4 text-left ring-1 transition-all',
                    on ? 'bg-brand-soft ring-2 ring-brand' : 'bg-surface ring-line hover:ring-muted',
                  )}
                >
                  <span className={cn('flex size-10 items-center justify-center rounded-lg', on ? 'bg-brand text-white' : 'bg-surface-alt text-muted')} aria-hidden>
                    <PromoTypeIcon type={t.value} className="size-5" />
                  </span>
                  <span className="mt-1 block font-semibold">{t.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{t.desc}</span>
                </button>
              );
            })}
          </div>
          {errors.type && <p className="mt-2 text-xs text-danger">{errors.type}</p>}
        </Step>

        {/* 2. ชื่อ + เวลา */}
        <Step n={2} title="ตั้งชื่อและช่วงเวลา">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อโปรโมชัน" htmlFor="name" error={errors.name} required className="sm:col-span-2" hint="ลูกค้าจะเห็นชื่อนี้บนหน้าร้าน">
              <input id="name" name="name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="เช่น ลด 20% เครื่องดื่มสุขภาพ" aria-invalid={Boolean(errors.name)} required />
            </Field>
            <Field label="เริ่ม" htmlFor="startsAt" error={errors.startsAt} required>
              <input id="startsAt" name="startsAt" type="datetime-local" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} aria-invalid={Boolean(errors.startsAt)} required />
            </Field>
            <Field label="สิ้นสุด" htmlFor="endsAt" error={errors.endsAt} required>
              <input id="endsAt" name="endsAt" type="datetime-local" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} aria-invalid={Boolean(errors.endsAt)} required />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">ตั้งเร็ว ๆ:</span>
            <Chip onClick={() => set('startsAt', toDatetimeLocal(new Date()))}>เริ่มตอนนี้</Chip>
            <Chip onClick={() => shiftEnd(1)}>1 วัน</Chip>
            <Chip onClick={() => shiftEnd(7)}>7 วัน</Chip>
            <Chip onClick={() => shiftEnd(30)}>30 วัน</Chip>
            <Chip onClick={endOfMonth}>ถึงสิ้นเดือน</Chip>
            {status && (
              <span className="ml-auto flex items-center gap-2">
                <Badge tone={STATUS_TONE[status]}>{PROMOTION_STATUS_LABEL[status]}</Badge>
                {status === 'scheduled' && <span className="text-xs text-muted">เริ่มใน {humanCountdown(preview.startsAt, now)}</span>}
                {status === 'live' && <span className="text-xs text-muted">เหลือ {humanCountdown(preview.endsAt, now)}</span>}
              </span>
            )}
          </div>
        </Step>

        {/* 3. scope */}
        <Step n={3} title="ใช้กับสินค้าไหน">
          <Segmented
            value={f.scopeKind}
            onChange={(v) => set('scopeKind', v)}
            options={[
              { value: 'all', label: 'ทั้งร้าน' },
              { value: 'categories', label: 'เลือกหมวดหมู่' },
              { value: 'products', label: 'เลือกสินค้า' },
            ]}
          />
          {f.scopeKind === 'categories' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = f.scopeIds.includes(c.id);
                return (
                  <label key={c.id} className={cn('cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 transition-colors', on ? 'bg-brand text-white ring-brand' : 'bg-surface ring-line hover:bg-surface-alt')}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set('scopeIds', on ? f.scopeIds.filter((id) => id !== c.id) : [...f.scopeIds, c.id])} />
                    {c.name}
                  </label>
                );
              })}
            </div>
          )}
          {f.scopeKind === 'products' && (
            <div className="mt-3">
              <ProductPicker products={products} categories={categories} selected={f.scopeIds} onChange={(ids) => set('scopeIds', ids)} />
            </div>
          )}
          {errors.scopeIds && <p className="mt-2 text-xs text-danger">{errors.scopeIds}</p>}
        </Step>

        {/* 4. ส่วนลด / รายละเอียดตามประเภท */}
        <Step n={4} title={f.type === 'bogo' ? 'กำหนดของแถม' : f.type === 'coupon' ? 'รายละเอียดคูปอง' : 'กำหนดส่วนลด'}>
          {f.type === 'coupon' && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <Field label="โค้ดคูปอง" htmlFor="couponCode" error={errors.couponCode} required hint="A–Z และตัวเลข 3–20 ตัว ลูกค้าพิมพ์ตอนชำระเงิน">
                <div className="flex gap-2">
                  <input
                    id="couponCode"
                    name="couponCode"
                    value={f.couponCode}
                    onChange={(e) => set('couponCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="เช่น SAVE100"
                    className="font-mono uppercase"
                    aria-invalid={Boolean(errors.couponCode)}
                    required
                  />
                  <Button variant="secondary" onClick={() => set('couponCode', randomCode())}>
                    สุ่ม
                  </Button>
                </div>
              </Field>
              <Field label="ยอดสินค้าขั้นต่ำ (บาท)" htmlFor="couponMinSubtotal" error={errors.couponMinSubtotal} hint="เว้นว่าง = ไม่มีขั้นต่ำ">
                <input id="couponMinSubtotal" name="couponMinSubtotal" inputMode="decimal" value={f.couponMinSubtotal} onChange={(e) => set('couponMinSubtotal', e.target.value)} placeholder="0" />
              </Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <Switch checked={f.couponFreeShipping} onChange={(v) => set('couponFreeShipping', v)} name="couponFreeShipping" label="ส่งฟรี" />
                <span>
                  <span className="font-medium">ส่งฟรี</span>
                  <span className="block text-xs text-muted">ยกเว้นค่าจัดส่งเมื่อใช้คูปองนี้ (จะใส่ส่วนลดด้วยหรือไม่ก็ได้)</span>
                </span>
              </label>
            </div>
          )}

          {f.type !== 'bogo' && (
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <Field label="ส่วนลด" htmlFor="discountValue" error={errors.discountValue} required={f.type === 'discount' || !f.couponFreeShipping}>
                <div className="flex">
                  <Segmented
                    value={f.discountMode}
                    onChange={(v) => set('discountMode', v)}
                    options={[
                      { value: 'percent', label: '%' },
                      { value: 'fixed', label: 'บาท' },
                    ]}
                    compact
                  />
                  <input
                    id="discountValue"
                    name="discountValue"
                    inputMode="decimal"
                    value={f.discountValue}
                    onChange={(e) => set('discountValue', e.target.value)}
                    placeholder={f.discountMode === 'percent' ? '20' : '100'}
                    className="ml-2 w-28!"
                    aria-invalid={Boolean(errors.discountValue)}
                  />
                </div>
              </Field>
              <div className="rounded-lg bg-surface-alt px-4 py-3 text-sm">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">ตัวอย่าง</p>
                {examplePrice ? (
                  <p className="mt-1">
                    <span className="text-muted">{examplePrice.name}</span>
                    <br />
                    <span className="text-muted line-through">{formatBaht(examplePrice.before)}</span>
                    <ArrowRight className="mx-2 inline size-4 align-[-2px] text-muted" aria-hidden />
                    <span className="text-lg font-bold text-accent">{formatBaht(examplePrice.after)}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-muted">{f.type === 'coupon' && f.couponFreeShipping ? 'คูปองส่งฟรีอย่างเดียว ไม่มีส่วนลดเพิ่ม' : 'กรอกส่วนลดเพื่อดูตัวอย่างราคา'}</p>
                )}
              </div>
            </div>
          )}

          {f.type === 'bogo' && (
            <div className="grid gap-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
              <Field label="ซื้อ (ชิ้น)" htmlFor="bogoBuy" error={errors.bogoBuy} required>
                <input id="bogoBuy" name="bogoBuy" type="number" min={1} value={f.bogoBuy} onChange={(e) => set('bogoBuy', e.target.value)} className="w-24!" required />
              </Field>
              <Field label="แถม (ชิ้น)" htmlFor="bogoGet" error={errors.bogoGet} required>
                <input id="bogoGet" name="bogoGet" type="number" min={1} value={f.bogoGet} onChange={(e) => set('bogoGet', e.target.value)} className="w-24!" required />
              </Field>
              <div className="rounded-lg bg-surface-alt px-4 py-3 text-sm">
                ลูกค้าซื้อ <b>{f.bogoBuy || '?'}</b> ชิ้น รับฟรีเพิ่ม <b>{f.bogoGet || '?'}</b> ชิ้น (สินค้าชิ้นเดียวกัน) · ซื้อ {Number(f.bogoBuy) * 2 || '?'} ได้ฟรี {Number(f.bogoGet) * 2 || '?'}
              </div>
            </div>
          )}
        </Step>

        {/* 5. limits */}
        <Step n={5} title="จำกัดจำนวน" description="ปิดไว้ = ไม่จำกัด · เปิดเฉพาะที่ต้องการ">
          <div className="divide-y divide-line">
            <LimitRow
              label="จำกัดสิทธิ์รวมทั้งโปร"
              desc="ใช้ได้กี่ออเดอร์ทั้งหมด เช่น 100 สิทธิ์แรก — ครบแล้วโปรปิดเองแม้ยังไม่หมดเวลา"
              unit="สิทธิ์"
              name="limitTotalUses"
              value={f.limitTotal}
              onChange={(v) => set('limitTotal', v)}
              error={errors.limitTotalUses}
            />
            {f.type !== 'coupon' && (
              <LimitRow
                label="จำกัดจำนวนชิ้นต่อสินค้า"
                desc={f.type === 'bogo' ? 'แถมได้สูงสุดกี่ชิ้นต่อสินค้าหนึ่งตัว (นับรวมทุกออเดอร์)' : 'สินค้าแต่ละตัวได้ราคาโปรกี่ชิ้น (นับรวมทุกออเดอร์) ส่วนที่เกินคิดราคาปกติ'}
                unit="ชิ้น/สินค้า"
                name="limitPerProductQty"
                value={f.limitPerProduct}
                onChange={(v) => set('limitPerProduct', v)}
                error={errors.limitPerProductQty}
              />
            )}
            <LimitRow
              label="จำกัดต่อลูกค้า 1 คน"
              desc="นับจากเบอร์โทรตอนชำระเงิน — ใช้ได้กี่ออเดอร์ต่อเบอร์"
              unit="ครั้ง/เบอร์"
              name="limitPerCustomer"
              value={f.limitPerCustomer}
              onChange={(v) => set('limitPerCustomer', v)}
              error={errors.limitPerCustomer}
            />
          </div>
        </Step>
      </div>

      {/* แถบสรุป + บันทึก ติดล่างจอ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">สรุป</p>
            <p className="line-clamp-2 text-sm">{summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.active} onChange={(v) => set('active', v)} label="เปิดใช้งาน" />
              เปิดใช้งาน
            </label>
            <Link href="/admin/promotions" className={buttonStyles({ variant: 'secondary' })}>
              ยกเลิก
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? 'กำลังบันทึก…' : promotion ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชัน'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ---------- ชิ้นส่วนย่อย ---------- */

function Step({ n, title, description, children }: { n: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-surface border border-line">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{n}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-surface-alt px-3 py-1 text-xs font-medium hover:bg-brand-soft hover:text-brand">
      {children}
    </button>
  );
}

function Segmented<T extends string>({ value, onChange, options, compact }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; compact?: boolean }) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg bg-surface-alt p-1', compact ? 'text-xs' : 'text-sm')}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn('rounded-md font-medium transition-colors', compact ? 'px-3 py-1.5' : 'px-4 py-1.5', on ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-ink')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function LimitRow({ label, desc, unit, name, value, onChange, error }: { label: string; desc: string; unit: string; name: string; value: Limit; onChange: (v: Limit) => void; error?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
      <Switch checked={value.on} onChange={(on) => onChange({ ...value, on })} label={label} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{desc}</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      {value.on && (
        <label className="flex items-center gap-2 text-sm">
          <input type="number" name={name} min={1} value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} className="w-24!" aria-label={`${label} (${unit})`} aria-invalid={Boolean(error)} />
          <span className="text-muted">{unit}</span>
        </label>
      )}
    </div>
  );
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
