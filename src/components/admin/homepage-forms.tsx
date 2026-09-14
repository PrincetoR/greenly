'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { savePopup, saveSlide } from '@/lib/actions/homepage';
import type { FormState } from '@/lib/validation/common';
import type { HeroSlide, HomePopup } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { ImageUploader } from '@/components/admin/image-uploader';

/** ฟอร์มสไลด์ (เพิ่ม/แก้ไข) — key ที่ผู้เรียกเปลี่ยนตาม id เพื่อรีเซ็ต state ตอนสลับรายการ */
export function SlideForm({ slide }: { slide?: HeroSlide }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSlide, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {slide && <input type="hidden" name="id" value={slide.id} />}
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">
          รูปแบนเนอร์ <span className="text-danger">*</span>
        </p>
        <p className="text-xs text-muted">สไลด์ใหญ่แนะนำ 1600×800 (2:1) · ภาพเล็กด้านขวาแนะนำ 800×400 (2:1) · ครอปกลางภาพให้พอดีช่อง</p>
        <div className="mt-2">
          <ImageUploader initial={slide?.image ? [slide.image] : v.image ? [v.image] : []} max={1} name="image" />
        </div>
        {errors.image && <p className="mt-1 text-xs text-danger">{errors.image}</p>}
      </div>
      <Field label="หัวข้อ" htmlFor="slide-title" error={errors.title} hint="เว้นว่างได้ถ้ารูปมีข้อความอยู่แล้ว">
        <input id="slide-title" name="title" defaultValue={v.title ?? slide?.title ?? ''} maxLength={80} />
      </Field>
      <Field label="ข้อความรอง" htmlFor="slide-subtitle" error={errors.subtitle}>
        <input id="slide-subtitle" name="subtitle" defaultValue={v.subtitle ?? slide?.subtitle ?? ''} maxLength={160} />
      </Field>
      <Field label="คลิกภาพแล้วไปที่" htmlFor="slide-href" error={errors.href} hint="คลิกได้ทั้งภาพ ไม่มีปุ่ม · เช่น /promotions · /category/เครื่องดื่มสุขภาพ · /product/… · https://… (ว่าง = คลิกไม่ได้)" className="sm:col-span-2">
        <input id="slide-href" name="href" defaultValue={v.href ?? slide?.href ?? ''} placeholder="/promotions" />
      </Field>
      <Field label="ตำแหน่ง" htmlFor="slide-slot" error={errors.slot} hint="แบบ Shopee: ซ้ายเป็นสไลด์ใหญ่ ขวาเป็นภาพเล็ก 2 ช่อง (ใช้ 2 ภาพแรกตามลำดับ)">
        <Select id="slide-slot" name="slot" defaultValue={v.slot ?? slide?.slot ?? 'main'} options={[{ value: 'main', label: 'สไลด์ใหญ่ด้านซ้าย (เลื่อน)' }, { value: 'side', label: 'ภาพเล็กด้านขวา (นิ่ง)' }]} />
      </Field>
      <Field label="ลำดับ" htmlFor="slide-order" error={errors.sortOrder}>
        <input id="slide-order" name="sortOrder" type="number" min={0} defaultValue={v.sortOrder ?? slide?.sortOrder ?? 10} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
        <input type="checkbox" name="active" defaultChecked={state.values ? v.active === 'on' : (slide?.active ?? true)} className="size-4 accent-brand" />
        แสดงบนหน้าแรก
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : slide ? 'บันทึกสไลด์' : 'เพิ่มสไลด์'}
        </Button>
        {slide && (
          <Link href="/admin/homepage" className={buttonStyles({ variant: 'secondary' })}>
            ยกเลิก
          </Link>
        )}
      </div>
    </form>
  );
}

const WIDTHS = [
  { value: 360, label: 'เล็ก 360' },
  { value: 480, label: 'กลาง 480' },
  { value: 640, label: 'ใหญ่ 640' },
  { value: 800, label: 'กว้าง 800' },
  { value: 960, label: 'กว้างมาก 960' },
];

export function PopupForm({ popup }: { popup: HomePopup }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePopup, {});
  const errors = state.errors ?? {};
  const v = state.values ?? {};
  const width = Number(v.width ?? popup.width);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <input type="checkbox" name="enabled" defaultChecked={state.values ? v.enabled === 'on' : popup.enabled} className="size-4 accent-brand" />
        เปิดป๊อปอัปตอนเข้าหน้าแรก
      </label>
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">รูป (ไม่บังคับ)</p>
        <div className="mt-2">
          <ImageUploader initial={popup.image ? [popup.image] : v.image ? [v.image] : []} max={1} name="image" />
        </div>
        {errors.image && <p className="mt-1 text-xs text-danger">{errors.image}</p>}
      </div>
      <Field label="หัวข้อ" htmlFor="popup-title" error={errors.title}>
        <input id="popup-title" name="title" defaultValue={v.title ?? popup.title} maxLength={80} />
      </Field>
      <Field label="ข้อความ" htmlFor="popup-body" error={errors.body} className="sm:row-span-2">
        <textarea id="popup-body" name="body" defaultValue={v.body ?? popup.body} rows={4} maxLength={500} />
      </Field>
      <Field label="คลิกรูป/เนื้อหาแล้วไปที่" htmlFor="popup-href" error={errors.href} hint="คลิกได้ทั้งป๊อปอัป ไม่มีปุ่ม · ว่าง = แค่แสดง (ปิดด้วยกากบาท)">
        <input id="popup-href" name="href" defaultValue={v.href ?? popup.href} placeholder="/promotions" />
      </Field>
      <Field label="ความกว้าง (px)" htmlFor="popup-width" error={errors.width} hint="จอเล็กกว่านี้จะย่อให้พอดีเอง · พิมพ์เองได้ 280–1200">
        <div className="flex gap-2">
          <Select
            aria-label="ความกว้างสำเร็จรูป"
            defaultValue={WIDTHS.some((w) => w.value === width) ? String(width) : ''}
            onChange={(val) => {
              const el = document.getElementById('popup-width') as HTMLInputElement | null;
              if (el && val) el.value = val;
            }}
            className="w-40 shrink-0"
            options={[{ value: '', label: 'กำหนดเอง' }, ...WIDTHS.map((w) => ({ value: String(w.value), label: w.label }))]}
          />
          <input id="popup-width" name="width" type="number" min={280} max={1200} step={10} defaultValue={width} className="min-w-0 flex-1" />
        </div>
      </Field>
      <Field label="แสดงบ่อยแค่ไหน" htmlFor="popup-frequency" error={errors.frequency}>
        <Select
          id="popup-frequency"
          name="frequency"
          defaultValue={v.frequency ?? popup.frequency}
          options={[
            { value: 'once', label: 'ครั้งเดียว (จนกว่าจะแก้ป๊อปอัป)' },
            { value: 'daily', label: 'วันละครั้ง' },
            { value: 'always', label: 'ทุกครั้งที่เปิดหน้าแรก' },
          ]}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'บันทึกป๊อปอัป'}
        </Button>
        <a href="/?popup=1" target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary' })}>
          ดูตัวอย่างบนหน้าแรก
        </a>
        <p className="text-xs text-muted">บันทึกแล้วลูกค้าที่เคยปิดจะเห็นป๊อปอัปใหม่อีกครั้ง</p>
      </div>
    </form>
  );
}
