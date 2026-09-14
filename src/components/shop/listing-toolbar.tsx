'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { SORT_OPTIONS, type SortValue } from './sort-options';

/**
 * แถบเครื่องมือหน้ารายการ: [หัวข้อว่ากำลังเปิดอะไร … ค้นหา · เรียงลำดับ] ในแถวเดียว
 * ค้นหาแบบพิมพ์แล้วมีผลทันที (หน่วง 300ms) ไม่มีปุ่มค้นหา
 * เรียงลำดับ/หมวดหมู่ (มือถือ) เป็น dropdown `Select` ของเราเอง (ปุ่มมีพื้นหลังตอนเปิด) แทน <select> ของเบราว์เซอร์
 * ทุกอย่างยังลงท้ายที่ URL query (q, sort) → แชร์ลิงก์/กด back ได้เหมือนเดิม
 */
export function ListingToolbar({
  title,
  description,
  count,
  basePath,
  q,
  sort,
  categoryOptions,
  currentCategoryHref,
}: {
  title: string;
  description?: string;
  count: number;
  basePath: string;
  q: string;
  sort: SortValue;
  categoryOptions: { href: string; label: string }[];
  currentCategoryHref: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [term, setTerm] = useState(q);

  const navigate = (nextQ: string, nextSort: SortValue) => {
    const p = new URLSearchParams();
    if (nextQ.trim()) p.set('q', nextQ.trim());
    if (nextSort !== 'newest') p.set('sort', nextSort);
    const s = p.toString();
    start(() => router.replace(`${basePath}${s ? `?${s}` : ''}`, { scroll: false }));
  };

  // ปุ่มค้นหาบนแถบเมนูล่างมือถือพามาที่ /products?focus=1 → โฟกัสช่องค้นหาให้เลย (อ่านจาก location ไม่ใช้ useSearchParams กัน suspense)
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === '1') inputRef.current?.focus();
  }, []);

  // พิมพ์แล้วค้นทันที — หน่วงเล็กน้อยไม่ให้ยิงทุกตัวอักษร
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onType = (value: string) => {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(value, sort), 300);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    /*
     * จอ md+: ใช้ grid คอลัมน์เดียวกับกริดสินค้า (md 3 / lg 4 คอลัมน์ gap 12) ให้ทุกขอบตรงกับการ์ด
     * lg: หัวข้อ = การ์ด 1–2 · [ค้นหา+เรียง] = การ์ด 3–4: เรียงลำดับกว้างตามข้อความที่ยาวสุด (ไม่ตัดคำ)
     *     ค้นหากินที่เหลือ เริ่มขอบซ้ายการ์ด 3 · ขอบขวาเรียงลำดับ = ขอบขวาการ์ด 4
     * md: หัวข้อ = การ์ด 1 · [ค้นหา+เรียง] = การ์ด 2–3 แบ่งแบบเดียวกัน
     */
    <div className="flex flex-wrap items-center gap-2 md:grid md:grid-cols-3 md:gap-3 lg:grid-cols-4">
      {/* หัวข้อ: กำลังเปิดอะไรอยู่ (ทั้งหมด / ชื่อหมวด / ผลค้นหา) + จำนวน */}
      {/* items-baseline: "24 รายการ" นั่งบนเส้นฐานเดียวกับหัวข้อ (ไม่ใช่กึ่งกลาง) */}
      <div className="flex h-10 min-w-0 basis-full items-baseline gap-2 md:col-span-1 md:basis-auto lg:col-span-2">
        {/*
         * line-height เต็มแถว 40px — truncate ใช้ overflow:hidden ถ้าบรรทัดเตี้ยกว่านั้น
         * วรรณยุกต์/สระบนของไทย (เช่น ไม้โทใน "ทั้ง") จะถูกตัดหัว
         */}
        <h1 className="truncate text-2xl leading-10 font-bold">{title}</h1>
        <span className="shrink-0 text-sm text-muted">{count} รายการ</span>
        {description && <span className="hidden truncate text-sm text-muted lg:inline">· {description}</span>}
      </div>

      {/* มือถือ: หมวดหมู่เป็น dropdown ใต้หัวข้อ (พี่ต่อสั่ง) — จอ md+ เป็นการ์ดแถบซ้าย */}
      <div className="w-full md:hidden">
        <Select size="bar" aria-label="หมวดหมู่" options={categoryOptions.map((o) => ({ value: o.href, label: o.label }))} value={currentCategoryHref} onChange={(href) => router.push(href)} />
      </div>

      <div className="flex min-w-0 flex-1 basis-full items-center gap-2 md:col-span-2 md:grid md:grid-cols-[1fr_auto] md:gap-2">
      <div className="relative min-w-0 flex-1 md:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={term}
          onChange={(e) => onType(e.target.value)}
          placeholder="ค้นหาสินค้า"
          aria-label="ค้นหา"
          className="h-10 pr-9! pl-9! [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              if (timer.current) clearTimeout(timer.current);
              navigate('', sort);
            }}
            aria-label="ล้างคำค้น"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* จองความกว้างเท่าข้อความยาวสุด ให้ปุ่มไม่เปลี่ยนขนาดตอนสลับตัวเลือก · เมนูชิดขวา */}
      <Select fit size="bar" align="end" aria-label="เรียงลำดับ" options={SORT_OPTIONS} value={sort} onChange={(v) => navigate(term, v as SortValue)} className="shrink-0" menuClassName="w-44" />
      </div>
    </div>
  );
}
