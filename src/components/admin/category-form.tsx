'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { saveCategory } from '@/lib/actions/catalog';
import { slugify, type FormState } from '@/lib/validation/common';
import type { Category } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ImageUploader } from '@/components/admin/image-uploader';
import { CategoryIcon } from '@/components/category-icon';
import { CATEGORY_ICONS } from '@/lib/catalog/category-icons';
import { cn } from '@/lib/cn';

export function CategoryForm({ category }: { category?: Category }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory, {});
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  // slug ตามชื่ออัตโนมัติจนกว่าผู้ใช้จะแก้เอง
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [icon, setIcon] = useState<string>(category?.icon ?? '');
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
      {/* ไอคอน/รูปสำหรับการ์ดหมวดบนหน้าแรก — มีรูปจะใช้รูป ไม่มีใช้ไอคอน ไม่มีทั้งคู่ใช้ถุงช้อปปิ้ง */}
      <fieldset className="sm:col-span-3">
        <legend className="text-sm font-medium">ไอคอน</legend>
        <input type="hidden" name="icon" value={icon} />
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="ไอคอนหมวดหมู่">
          {CATEGORY_ICONS.map((it) => (
            <button
              key={it.name}
              type="button"
              role="radio"
              aria-checked={icon === it.name}
              title={it.label}
              onClick={() => setIcon(icon === it.name ? '' : it.name)}
              className={cn('flex size-10 items-center justify-center rounded-lg border transition-colors', icon === it.name ? 'border-brand bg-brand-soft text-brand' : 'border-line text-muted hover:bg-surface-alt hover:text-ink')}
            >
              <CategoryIcon icon={it.name} className="size-5" />
            </button>
          ))}
        </div>
        {errors.icon && <p className="mt-1 text-xs text-danger">{errors.icon}</p>}
        <p className="mt-1 text-xs text-muted">{icon ? `เลือก: ${CATEGORY_ICONS.find((i) => i.name === icon)?.label} (กดซ้ำเพื่อเอาออก)` : 'ยังไม่เลือก — จะใช้ไอคอนถุงช้อปปิ้ง'}</p>
      </fieldset>
      <div className="sm:col-span-3">
        <p className="text-sm font-medium">รูปหมวด (ใช้แทนไอคอน)</p>
        <p className="mt-0.5 text-xs text-muted">แสดงเป็นสี่เหลี่ยมเต็มรูป ไม่ครอปวงกลม — แนะนำ PNG พื้นโปร่ง หรือพื้นขาวเท่าการ์ด จะได้กลมกลืน</p>
        <div className="mt-2">
          <ImageUploader initial={category?.image ? [category.image] : []} max={1} name="image" />
        </div>
        {errors.image && <p className="mt-1 text-xs text-danger">{errors.image}</p>}
      </div>
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
