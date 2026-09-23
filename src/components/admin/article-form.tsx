'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { saveArticle } from '@/lib/actions/articles';
import { slugify, type FormState } from '@/lib/validation/common';
import { toDatetimeLocal } from '@/lib/datetime';
import type { Article } from '@/lib/types';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ImageUploader } from './image-uploader';

/**
 * ฟอร์มบทความ — เนื้อหาเป็นข้อความล้วน (ไม่มี rich text): ย่อหน้าคั่นด้วยบรรทัดว่าง · "## " หัวข้อย่อย · "- " รายการ
 * เผยแพร่ = ติ๊ก "เผยแพร่" + วันเวลาถึงกำหนด → ตั้งเวลาโพสต์ล่วงหน้าได้เหมือนโปรโมชัน
 */
export function ArticleForm({ article, defaultAuthor }: { article?: Article; defaultAuthor: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveArticle, {});
  const [title, setTitle] = useState(article?.title ?? '');
  const [slug, setSlug] = useState(article?.slug ?? '');
  // slug ตามหัวข้ออัตโนมัติจนกว่าผู้ใช้จะแก้เอง
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const errors = state.errors ?? {};
  const v = state.values ?? {};

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-[1fr_320px]">
      {article && <input type="hidden" name="id" value={article.id} />}

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader title="เนื้อหา" />
          <div className="grid gap-4 p-5">
            <Field label="หัวข้อ" htmlFor="title" error={errors.title} required>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                aria-invalid={Boolean(errors.title)}
                required
              />
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
            <Field label="สรุปสั้น" htmlFor="excerpt" error={errors.excerpt} hint="1–2 บรรทัด แสดงบนการ์ดรายการบทความ" required>
              <textarea id="excerpt" name="excerpt" rows={2} defaultValue={v.excerpt ?? article?.excerpt ?? ''} aria-invalid={Boolean(errors.excerpt)} required />
            </Field>
            <Field
              label="เนื้อหา"
              htmlFor="body"
              error={errors.body}
              hint='เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่ · ขึ้นต้นบรรทัดด้วย "## " = หัวข้อย่อย · "- " = รายการ'
              required
            >
              <textarea id="body" name="body" rows={16} defaultValue={v.body ?? article?.body ?? ''} aria-invalid={Boolean(errors.body)} required />
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader title="รูปปก" description="แนะนำสัดส่วน 16:9" />
          <div className="p-5">
            <ImageUploader initial={article?.cover ? [article.cover] : []} max={1} name="cover" />
            {errors.cover && <p className="mt-2 text-xs text-danger">{errors.cover}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="การเผยแพร่" />
          <div className="grid gap-4 p-5">
            <Field label="ผู้เขียน" htmlFor="author" error={errors.author}>
              <input id="author" name="author" defaultValue={v.author ?? article?.author ?? defaultAuthor} />
            </Field>
            <Field label="วันเวลาเผยแพร่" htmlFor="publishedAt" error={errors.publishedAt} hint="ตั้งเป็นอนาคตได้ — บทความจะขึ้นหน้าร้านเมื่อถึงเวลา" required>
              <input
                id="publishedAt"
                name="publishedAt"
                type="datetime-local"
                defaultValue={v.publishedAt ?? toDatetimeLocal(article?.publishedAt ?? new Date())}
                aria-invalid={Boolean(errors.publishedAt)}
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="published" defaultChecked={state.values ? v.published === 'on' : (article?.published ?? true)} className="size-4 accent-brand" />
              เผยแพร่ (ไม่ติ๊ก = ฉบับร่าง)
            </label>
          </div>
        </Card>

        {state.message && <Alert tone="danger">{state.message}</Alert>}

        <div className="flex gap-2 lg:sticky lg:bottom-4">
          <Button type="submit" size="lg" disabled={pending} className="flex-1">
            {pending ? 'กำลังบันทึก…' : article ? 'บันทึกการแก้ไข' : 'เพิ่มบทความ'}
          </Button>
          <Link href="/admin/articles" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
            ยกเลิก
          </Link>
        </div>
      </div>
    </form>
  );
}
