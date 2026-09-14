'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ProductImage } from '@/components/product-image';

/**
 * แกลเลอรีสินค้าแบบ Shopee (พี่ต่อสั่ง 2026-09-15): รูปหลักเป็นแถวเลื่อนข้าง snap ทีละรูป ปัดดูได้ทั้งมือถือ/จอใหญ่
 * มือถือ = เต็มความกว้างจอ ไม่มีขอบ/มุมมน + ตัวนับ "1/3" มุมล่างขวา · จอใหญ่ = การ์ดมีขอบ + รูปย่อด้านล่าง + ปุ่มซ้ายขวาตอน hover
 */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : [null];
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const n = (i + list.length) % list.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="group relative">
      <div ref={ref} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none md:rounded-card md:border md:border-line" aria-roledescription="carousel" aria-label="รูปสินค้า">
        {list.map((src, i) => (
          <div key={src ?? i} className="w-full shrink-0 snap-start" role="group" aria-label={`รูปที่ ${i + 1} จาก ${list.length}`}>
            <ProductImage src={src} alt={i === 0 ? alt : `${alt} (${i + 1})`} priority={i === 0} />
          </div>
        ))}
      </div>

      {list.length > 1 && (
        <>
          {/* ตัวนับมุมล่างขวา (มือถือ) */}
          <span className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2.5 py-0.5 text-xs font-medium text-white tabular-nums md:hidden" aria-live="polite">
            {index + 1}/{list.length}
          </span>
          {/* ปุ่มเลื่อน (จอมีเมาส์) */}
          <button type="button" onClick={() => go(index - 1)} aria-label="รูปก่อนหน้า" className="absolute top-1/2 left-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 md:flex">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="รูปถัดไป" className="absolute top-1/2 right-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 md:flex">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {/* รูปย่อ (จอใหญ่) */}
          <ul className="-mx-1 mt-2 hidden gap-2 overflow-x-auto p-1 scrollbar-none md:flex">
            {list.map((src, i) => (
              <li key={src ?? i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`รูปที่ ${i + 1}`}
                  aria-current={i === index}
                  className={cn('block size-16 overflow-hidden rounded-lg ring-2 transition-colors', i === index ? 'ring-brand' : 'ring-line hover:ring-muted')}
                >
                  <ProductImage src={src} alt="" className="size-16" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
