'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';

/**
 * ช่องค้นหาทั้งเว็บ (หน้า /search — พี่ต่อสั่ง 2026-09-15): text box เปล่า ๆ โฟกัสทันที พิมพ์แล้วผลขึ้นเอง (หน่วง 300ms → ?q= ให้ server render ผล)
 * ไม่มีปุ่มย้อนกลับ — นำทางด้วยแถบเมนูล่าง (พี่ต่อสั่ง) · กากบาทล้างคำค้น
 */
export function SearchBox({ q }: { q: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [term, setTerm] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (value: string) => {
    const v = value.trim();
    start(() => router.replace(v ? `/search?q=${encodeURIComponent(v)}` : '/search', { scroll: false }));
  };
  const onType = (value: string) => {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(value), 300);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={term}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (timer.current) clearTimeout(timer.current);
              go(term);
            }
          }}
          placeholder="ค้นหาสินค้าและโปรโมชัน"
          aria-label="ค้นหาทั้งเว็บ"
          autoFocus
          autoComplete="off"
          className="h-12 pr-10! pl-10! text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              if (timer.current) clearTimeout(timer.current);
              go('');
            }}
            aria-label="ล้างคำค้น"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
