'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * แถวเลื่อนแนวนอน (หมวดหมู่บนมือถือ · โปรโมชันหน้าแรก) พร้อมสัญญาณว่าเลื่อนได้:
 *  · จุดบอกหน้าใต้แถว · ปุ่มซ้าย/ขวาบนจอที่มีเมาส์ (โผล่ตอนชี้) · ไม่มีขอบไล่จาง (พี่ต่อไม่เอา)
 *  · scroll-snap ทีละหน้า (snap-x mandatory) · ปัดนิ้ว/ทัชแพดได้ตามปกติ
 * ผู้เรียกจัด layout ของลูกเอง (grid/flex) — ตัวนี้แค่ครอบให้เลื่อน + วัดหน้า
 */
export function HScroller({ children, className, ariaLabel }: { children: React.ReactNode; className?: string; ariaLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const w = el.clientWidth || 1;
      const total = el.scrollWidth;
      // มีของล้นแม้ไม่ถึงหน้าเต็มก็นับเป็นอีกหน้า (4 ใบที่ 3 ใบ/หน้า = 2 หน้า)
      const n = Math.max(1, Math.ceil((total - 1) / w));
      setPages(n);
      // หน้าปัจจุบัน: เลื่อนสุดขวาแล้วถือเป็นหน้าสุดท้าย (หน้าท้ายมักไม่เต็มความกว้าง)
      setPage(el.scrollLeft + w >= total - 1 ? n - 1 : Math.min(n - 1, Math.round(el.scrollLeft / w)));
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + w >= total - 1);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    schedule();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };
  const scrollable = pages > 1;

  return (
    <div className={cn('group/hs relative', className)}>
      {/* scroll-padding = padding เดียวกัน ไม่งั้น snap ดึงการ์ดแรกไปซ่อนใต้ padding ซ้าย */}
      <div ref={ref} className="scrollbar-none -mx-4 snap-x snap-mandatory scroll-pl-4 overflow-x-auto px-4 sm:-mx-1 sm:scroll-pl-1 sm:px-1" role="region" aria-label={ariaLabel}>
        {children}
      </div>
      {/* ไม่มีขอบไล่จาง — พี่ต่อ: จุดด้านล่างก็บอกอยู่แล้วว่าเลื่อนได้ ขอบให้แสดงปกติ */}
      {scrollable && (
        <>
          <button type="button" onClick={() => go(-1)} disabled={atStart} aria-label="เลื่อนไปซ้าย" className="absolute top-1/2 -left-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink opacity-0 shadow border border-line transition-opacity group-hover/hs:opacity-100 disabled:opacity-0! sm:flex">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(1)} disabled={atEnd} aria-label="เลื่อนไปขวา" className="absolute top-1/2 -right-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-ink opacity-0 shadow border border-line transition-opacity group-hover/hs:opacity-100 disabled:opacity-0! sm:flex">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label={`${ariaLabel} หน้า`}>
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === page}
                aria-label={`หน้า ${i + 1}`}
                onClick={() => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' })}
                className={cn('h-1.5 rounded-full transition-all', i === page ? 'w-5 bg-brand' : 'w-1.5 bg-line hover:bg-muted')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
