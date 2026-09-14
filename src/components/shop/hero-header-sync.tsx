'use client';

import { useEffect } from 'react';

/**
 * หน้าแรก — ผูกแบนเนอร์กับการเลื่อน (พี่ต่อสั่ง):
 *  1) เส้นล่างของ header โปร่งตราบใดที่แถบแบนเนอร์ยังอยู่ใต้ header · โผล่เมื่อ "เส้นขอบล่างของแถบ" เลื่อนขึ้นมาถึง header
 *  2) รูปสไลด์/ภาพเล็กค่อย ๆ จางตามการเลื่อน — จางหมด (opacity 0) เมื่อเลื่อนได้ 30% ของความสูงแถบ
 * ใส่ class ที่ <html> (CSS ใน globals.css) และ style opacity ที่ [data-hero-content] · ถอดทิ้งตอนออกจากหน้า
 */
export function HeroHeaderSync() {
  useEffect(() => {
    const root = document.documentElement;
    const band = document.querySelector<HTMLElement>('[data-hero-band]');
    const content = document.querySelector<HTMLElement>('[data-hero-content]');
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!band || !content || !header) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const headerBottom = header.getBoundingClientRect().bottom;
      const rect = band.getBoundingClientRect();
      // เส้น header กลับมาเมื่อขอบล่างของแถบขึ้นมาถึง (หรือพ้น) ขอบล่าง header
      root.classList.toggle('hero-at-top', rect.bottom > headerBottom + 0.5);
      // จางหมดเมื่อเลื่อนได้ 30% ของความสูงแถบ (พี่ต่อสั่ง — เดิม 50%)
      const fadeDistance = Math.max(1, rect.height * 0.3);
      content.style.opacity = String(Math.max(0, 1 - window.scrollY / fadeDistance));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.classList.remove('hero-at-top');
      content.style.opacity = '';
    };
  }, []);
  return null;
}
