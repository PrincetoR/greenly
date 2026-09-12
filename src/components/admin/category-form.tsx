'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveCategory } from '@/lib/actions/catalog';
import { slugify, type FormState } from '@/lib/validation/common';
import type { Category } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

export function CategoryForm({ category }: { category?: Category }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory, {});
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  // slug ตามชื่ออัตโนมัติจนกว่าผู้ใช้จะแก้เอง
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_120px] sm:items-start">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="ชื่อหมวดหมู่" htmlFor="cat-name" error={errors.name} required>
        <input
          id="cat-name"
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
      <Field label="slug (ใช้ใน URL)" htmlFor="cat-slug" error={errors.slug} required>
        <input
          id="cat-slug"
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
      <Field label="ลำดับ" htmlFor="cat-order" error={errors.sortOrder}>
        <input id="cat-order" name="sortOrder" type="number" defaultValue={v.sortOrder ?? category?.sortOrder ?? 100} min={0} />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="active" defaultChecked={state.values ? v.active === 'on' : (category?.active ?? true)} className="size-4 accent-brand" />
        แสดงบนหน้าร้าน
      </label>
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'กำลังบันทึก…' : category ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
        </Button>
        {category && (
          <Link href="/admin/categories" className={buttonStyles({ variant: 'secondary' })}>
            ยกเลิก
          </Link>
        )}
      </div>
    </form>
  );
}
