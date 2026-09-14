'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HeroSlide } from '@/lib/types';
import { buttonStyles } from '@/components/ui/button';

/**
 * สไลด์แบนเนอร์หน้าแรก — เลื่อนเอง (autoplaySeconds · 0 = ไม่เลื่อน) หยุดตอนชี้เมาส์/โฟกัส · ปุ่มซ้าย-ขวา · จุดบอกตำแหน่ง · ปุ่มลูกศรคีย์บอร์ด
 * แต่ละสไลด์คลิกได้ทั้งภาพถ้ามี href · ข้อความ/ปุ่มซ้อนบนรูปพร้อมไล่เฉดให้อ่านออก
 * เลื่อนแบบ translateX ทั้งแถว (ไม่ใช่ fade) ให้รู้สึกเป็น "สไลด์" จริง
 */
export function HeroSlider({ slides, autoplaySeconds }: { slides: HeroSlide[]; autoplaySeconds: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (count < 2 || autoplaySeconds <= 0 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), autoplaySeconds * 1000);
    return () => clearInterval(t);
  }, [count, autoplaySeconds, paused]);

  if (count === 0) return null;

  return (
    <section
      className="group relative overflow-hidden bg-ink"
      aria-roledescription="carousel"
      aria-label="แบนเนอร์"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }} aria-live="polite">
        {slides.map((s, i) => {
          const body = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.image} alt={s.title || ''} className="absolute inset-0 size-full object-cover" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
              {(s.title || s.subtitle || (s.href && s.buttonLabel)) && (
                <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" aria-hidden />
              )}
              <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center gap-3 px-4 py-10 text-white sm:px-8">
                {s.title && <p className="max-w-xl text-3xl font-bold leading-tight drop-shadow sm:text-5xl">{s.title}</p>}
                {s.subtitle && <p className="max-w-lg text-base text-white/90 drop-shadow sm:text-lg">{s.subtitle}</p>}
                {s.href && s.buttonLabel && <span className={cn(buttonStyles({ size: 'lg' }), 'w-fit')}>{s.buttonLabel}</span>}
              </div>
            </>
          );
          const cls = 'relative block h-[260px] w-full shrink-0 sm:h-[360px] lg:h-[440px]';
          return (
            <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${count}`} aria-hidden={i !== index} className="w-full shrink-0">
              {s.href ? (
                s.href.startsWith('/') ? (
                  <Link href={s.href} className={cls} tabIndex={i === index ? 0 : -1}>
                    {body}
                  </Link>
                ) : (
                  <a href={s.href} target="_blank" rel="noreferrer" className={cls} tabIndex={i === index ? 0 : -1}>
                    {body}
                  </a>
                )
              ) : (
                <div className={cls}>{body}</div>
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="สไลด์ก่อนหน้า" className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 sm:left-4">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="สไลด์ถัดไป" className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 sm:right-4">
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" role="tablist" aria-label="เลือกสไลด์">
            {slides.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={i === index} aria-label={`สไลด์ ${i + 1}`} onClick={() => go(i)} className={cn('h-2 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80')} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
