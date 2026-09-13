'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SORT_OPTIONS, type SortValue } from './sort-options';
import { CategorySelect } from './category-select';

/**
 * แถบเครื่องมือหน้ารายการ: [หัวข้อว่ากำลังเปิดอะไร … ค้นหา · เรียงลำดับ] ในแถวเดียว
 * ค้นหาแบบพิมพ์แล้วมีผลทันที (หน่วง 300ms) ไม่มีปุ่มค้นหา
 * เรียงลำดับเป็น dropdown แบบเดียวกับเมนูบัญชี (ปุ่มมีพื้นหลังตอนเปิด) แทน <select> ของเบราว์เซอร์
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
     * จอ md+: ใช้ grid คอลัมน์เดียวกับกริดสินค้า (md 3 / lg 4 คอลัมน์ gap 16) ให้ทุกขอบตรงกับการ์ด
     * lg: หัวข้อ = การ์ด 1–2 · [ค้นหา+เรียง] = การ์ด 3–4 โดย "ช่องว่าง 8px" ระหว่างค้นหากับเรียงลำดับ
     *     อยู่กึ่งกลางการ์ด 4 พอดี (ค้นหา = 75% ของช่วง เพราะ 1.5w+g−4 = 0.75(2w+g) เมื่อ g=16)
     * md: หัวข้อ = การ์ด 1 · [ค้นหา+เรียง] = การ์ด 2–3 แบ่งแบบเดียวกัน
     */
    <div className="flex flex-wrap items-center gap-2 md:grid md:grid-cols-3 md:gap-4 lg:grid-cols-4">
      <div className="w-full md:hidden">
        <CategorySelect options={categoryOptions} value={currentCategoryHref} />
      </div>

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

      <div className="flex min-w-0 flex-1 basis-full items-center gap-2 md:col-span-2 md:grid md:grid-cols-[75%_1fr] md:gap-2">
      <div className="relative min-w-0 flex-1 md:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={term}
          onChange={(e) => onType(e.target.value)}
          placeholder="ค้นหาในรายการนี้"
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

      <SortMenu value={sort} onChange={(v) => navigate(term, v)} />
      </div>
    </div>
  );
}

function SortMenu({ value, onChange }: { value: SortValue; onChange: (v: SortValue) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`เรียงลำดับ: ${current.label}`}
        className={cn(
          // ใช้ border จริง (อยู่ในกล่อง) ไม่ใช่ ring (วาดนอกกล่อง) ให้สูงเท่าช่องค้นหาเป๊ะ 40px
          'flex h-10 w-full items-center gap-1 rounded-lg border border-line px-2.5 text-sm font-medium transition-colors hover:bg-surface-alt',
          open ? 'bg-surface-alt' : 'bg-surface',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{current.short}</span>
        <ChevronDown className={cn('size-4 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open && (
        <ul role="listbox" aria-label="เรียงลำดับ" className="absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-card bg-surface p-1.5 shadow-lg ring-1 ring-line">
          {SORT_OPTIONS.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setOpen(false);
                    onChange(o.value);
                  }}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-alt', on && 'text-brand')}
                >
                  <span className="flex-1">{o.label}</span>
                  {on && <Check className="size-4" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
