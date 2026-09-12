'use client';

import { useActionState } from 'react';
import { updateSettings } from '@/lib/actions/settings';
import { satangToInput } from '@/lib/money';
import type { Settings } from '@/lib/types';
import type { FormState } from '@/lib/validation/common';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateSettings, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok && <Alert tone="ok">{state.message}</Alert>}
      {state.errors && <Alert tone="danger">กรุณาตรวจสอบข้อมูลที่กรอก</Alert>}

      <Card>
        <CardHeader title="ข้อมูลร้าน" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="ชื่อร้าน" htmlFor="storeName" error={errors.storeName} required>
            <input id="storeName" name="storeName" defaultValue={v.storeName ?? settings.storeName} required />
          </Field>
          <Field label="สโลแกน" htmlFor="tagline" error={errors.tagline}>
            <input id="tagline" name="tagline" defaultValue={v.tagline ?? settings.tagline} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="การจัดส่งและสต็อก" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="ค่าจัดส่ง (บาท)" htmlFor="shippingFee" error={errors.shippingFee} required>
            <input id="shippingFee" name="shippingFee" inputMode="decimal" defaultValue={v.shippingFee ?? satangToInput(settings.shippingFee)} required />
          </Field>
          <Field label="ส่งฟรีเมื่อยอดถึง (บาท)" htmlFor="freeShippingMin" error={errors.freeShippingMin} hint="เว้นว่าง = ไม่มีส่งฟรี">
            <input id="freeShippingMin" name="freeShippingMin" inputMode="decimal" defaultValue={v.freeShippingMin ?? (settings.freeShippingMin !== null ? satangToInput(settings.freeShippingMin) : '')} />
          </Field>
          <Field label="เตือนสินค้าใกล้หมดเมื่อเหลือ ≤" htmlFor="lowStockThreshold" error={errors.lowStockThreshold}>
            <input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={v.lowStockThreshold ?? settings.lowStockThreshold} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="ช่องทางติดต่อ" description="แสดงที่ footer ของหน้าร้าน" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="โทรศัพท์" htmlFor="phone" error={errors.phone}>
            <input id="phone" name="phone" defaultValue={v.phone ?? settings.contact.phone} />
          </Field>
          <Field label="อีเมล" htmlFor="email" error={errors.email}>
            <input id="email" name="email" type="email" defaultValue={v.email ?? settings.contact.email} />
          </Field>
          <Field label="LINE" htmlFor="line" error={errors.line}>
            <input id="line" name="line" defaultValue={v.line ?? settings.contact.line} />
          </Field>
        </div>
      </Card>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}
        </Button>
      </div>
    </form>
  );
}
