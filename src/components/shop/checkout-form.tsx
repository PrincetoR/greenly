'use client';

import { useActionState, useState } from 'react';
import { placeOrder, type CheckoutState } from '@/lib/actions/checkout';
import { formatBaht } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/cn';

const PAYMENTS = [
  { value: 'transfer', title: 'โอนเงินผ่านธนาคาร', desc: 'แจ้งเลขบัญชีหลังสั่งซื้อ (จำลอง)' },
  { value: 'cod', title: 'เก็บเงินปลายทาง', desc: 'ชำระกับพนักงานส่งของ' },
] as const;

export function CheckoutForm({ total, gifts }: { total: number; gifts: number }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const [payment, setPayment] = useState<'transfer' | 'cod'>('transfer');
  const errors = state.errors ?? {};
  const v = state.values ?? {};
  // ถ้า server บอกว่ายอดเปลี่ยน ให้ส่งยอดใหม่กลับไปในการยืนยันครั้งถัดไป
  const expectedTotal = state.newTotal ?? total;
  const expectedGifts = state.newGifts ?? gifts;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="expectedTotal" value={expectedTotal} />
      <input type="hidden" name="expectedGifts" value={expectedGifts} />

      {state.message && (
        <Alert tone={state.newTotal !== undefined ? 'warn' : 'danger'}>
          <p>{state.message}</p>
          {state.warnings && state.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {state.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <section className="rounded-card bg-surface p-5 border border-line">
        <h2 className="font-semibold">ข้อมูลผู้รับ</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล" htmlFor="name" error={errors.name} required>
            <input id="name" name="name" defaultValue={v.name} autoComplete="name" required aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="เบอร์โทร" htmlFor="phone" error={errors.phone} required hint="ใช้ตรวจสิทธิ์โปรโมชันต่อลูกค้า">
            <input id="phone" name="phone" defaultValue={v.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" required aria-invalid={Boolean(errors.phone)} />
          </Field>
          <Field label="อีเมล" htmlFor="email" error={errors.email} className="sm:col-span-2">
            <input id="email" name="email" defaultValue={v.email} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} />
          </Field>
          <Field label="ที่อยู่จัดส่ง" htmlFor="address" error={errors.address} required className="sm:col-span-2">
            <textarea id="address" name="address" defaultValue={v.address} rows={3} autoComplete="street-address" required aria-invalid={Boolean(errors.address)} />
          </Field>
        </div>
      </section>

      <section className="rounded-card bg-surface p-5 border border-line">
        <h2 className="font-semibold">วิธีชำระเงิน</h2>
        <div role="radiogroup" className="mt-4 grid gap-3 sm:grid-cols-2">
          {PAYMENTS.map((p) => {
            const on = payment === p.value;
            return (
              <label key={p.value} className={cn('flex cursor-pointer gap-3 rounded-lg p-3 ring-1 transition-colors', on ? 'bg-brand-soft ring-2 ring-brand' : 'ring-line hover:bg-surface-alt')}>
                <input type="radio" name="paymentMethod" value={p.value} checked={on} onChange={() => setPayment(p.value)} className="mt-1 accent-brand" />
                <span>
                  <span className="block font-medium">{p.title}</span>
                  <span className="block text-xs text-muted">{p.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.paymentMethod && <p className="mt-2 text-xs text-danger">{errors.paymentMethod}</p>}
        <Field label="หมายเหตุถึงร้าน" htmlFor="note" className="mt-4">
          <textarea id="note" name="note" defaultValue={v.note} rows={2} placeholder="เช่น ฝากไว้ที่ป้อมยาม" />
        </Field>
      </section>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'กำลังสั่งซื้อ…' : state.newTotal !== undefined ? `ยืนยันสั่งซื้อ ${formatBaht(state.newTotal)}` : `ยืนยันสั่งซื้อ ${formatBaht(total)}`}
      </Button>
      <p className="text-center text-xs text-muted">นี่คือระบบสาธิต — ไม่มีการตัดเงินจริง</p>
    </form>
  );
}
