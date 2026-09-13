'use client';

import { useActionState } from 'react';
import { lookupOrder, type LookupState } from '@/lib/actions/customer-orders';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

/**
 * ฟอร์ม "ค้นหาคำสั่งซื้อ" ด้วยเลขที่ + เบอร์โทร
 * ใช้ 2 ที่: หน้า /orders (หาออเดอร์จากเครื่องอื่น) และหน้า /order/[no] เมื่อเครื่องนี้ยังไม่ได้รับสิทธิ์ดู
 */
export function OrderLookupForm({ orderNo, compact }: { orderNo?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupOrder, {});
  const lockedNo = orderNo !== undefined;

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className={compact ? 'flex flex-col gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        {lockedNo ? (
          <input type="hidden" name="orderNo" value={orderNo} />
        ) : (
          <Field label="เลขที่คำสั่งซื้อ" htmlFor="lookup-no" required>
            <input id="lookup-no" name="orderNo" defaultValue={state.values?.orderNo} placeholder="OD-20260912-0001" className="font-mono uppercase" required />
          </Field>
        )}
        <Field label="เบอร์โทรที่ใช้สั่งซื้อ" htmlFor="lookup-phone" required>
          <input id="lookup-phone" name="phone" type="tel" inputMode="tel" placeholder="08x-xxx-xxxx" required />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? 'กำลังค้นหา…' : lockedNo ? 'ยืนยันและดูคำสั่งซื้อ' : 'ค้นหาคำสั่งซื้อ'}
      </Button>
    </form>
  );
}
