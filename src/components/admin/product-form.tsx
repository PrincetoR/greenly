'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { saveProduct } from '@/lib/actions/catalog';
import { satangToInput } from '@/lib/money';
import { slugify, type FormState } from '@/lib/validation/common';
import type { Category, Product } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ImageUploader } from './image-uploader';

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, {});
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="ข้อมูลสินค้า" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="ชื่อสินค้า" htmlFor="name" error={errors.name} required className="sm:col-span-2">
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                aria-invalid={Boolean(errors.name)}
                required
              />
            </Field>
            <Field label="SKU" htmlFor="sku" error={errors.sku} required>
              <input id="sku" name="sku" defaultValue={v.sku ?? product?.sku ?? ''} aria-invalid={Boolean(errors.sku)} required />
            </Field>
            <Field label="slug (ใช้ใน URL)" htmlFor="slug" error={errors.slug} required>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                aria-invalid={Boolean(errors.slug)}
                required
              />
            </Field>
            <Field label="คำอธิบาย" htmlFor="description" error={errors.description} className="sm:col-span-2">
              <textarea id="description" name="description" rows={5} defaultValue={v.description ?? product?.description ?? ''} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="รูปสินค้า" description="รูปแรกจะแสดงเป็นรูปปกบนหน้าร้าน" />
          <div className="p-5">
            <ImageUploader initial={product?.images ?? []} />
            {errors.images && <p className="mt-2 text-xs text-danger">{errors.images}</p>}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="ราคาและสต็อก" />
          <div className="grid gap-4 p-5">
            <Field label="ราคา (บาท)" htmlFor="price" error={errors.price} required>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                defaultValue={v.price ?? (product ? satangToInput(product.price) : '')}
                placeholder="0.00"
                aria-invalid={Boolean(errors.price)}
                required
              />
            </Field>
            <Field label="จำนวนคงเหลือ" htmlFor="stock" error={errors.stock} required>
              <input id="stock" name="stock" type="number" min={0} defaultValue={v.stock ?? product?.stock ?? 0} aria-invalid={Boolean(errors.stock)} required />
            </Field>
            <Field label="หมวดหมู่" htmlFor="categoryId" error={errors.categoryId} required>
              <select id="categoryId" name="categoryId" defaultValue={v.categoryId ?? product?.categoryId ?? ''} aria-invalid={Boolean(errors.categoryId)} required>
                <option value="" disabled>
                  เลือกหมวดหมู่
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="การแสดงผล" />
          <div className="flex flex-col gap-3 p-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={state.values ? v.active === 'on' : (product?.active ?? true)} className="size-4 accent-brand" />
              เปิดขาย (แสดงบนหน้าร้าน)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="featured" defaultChecked={state.values ? v.featured === 'on' : (product?.featured ?? false)} className="size-4 accent-brand" />
              สินค้าแนะนำ (ขึ้นหน้าแรก)
            </label>
          </div>
        </Card>

        {state.message && <Alert tone="danger">{state.message}</Alert>}

        <div className="flex gap-2 lg:sticky lg:bottom-4">
          <Button type="submit" size="lg" disabled={pending} className="flex-1">
            {pending ? 'กำลังบันทึก…' : product ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
          </Button>
          <Link href="/admin/products" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            ยกเลิก
          </Link>
        </div>
      </div>
    </form>
  );
}
