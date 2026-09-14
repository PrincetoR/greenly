'use client';

import { useEffect } from 'react';

/**
 * หน้าแรก — ผูกแบนเนอร์กับการเลื่อน (พี่ต่อสั่ง):
 *  1) เส้นล่างของ header โปร่งตราบใดที่ยังเห็นรูปสไลด์ (opacity > 0) · โผล่ทันทีที่รูปจางหมด
 *  2) รูปสไลด์/ภาพเล็กค่อย ๆ จางตามการเลื่อน — จางหมด (opacity 0) เมื่อเลื่อนได้ 30% ของความสูงแถบ
 * ใส่ class ที่ <html> (CSS ใน globals.css) และ style opacity ที่ [data-hero-content] · ถอดทิ้งตอนออกจากหน้า
 */
export function HeroHeaderSync() {
  useEffect(() => {
    const root = document.documentElement;
    const band = document.querySelector<HTMLElement>('[data-hero-band]');
    const content = document.querySelector<HTMLElement>('[data-hero-content]');
    if (!band || !content) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = band.getBoundingClientRect();
      // จางหมดเมื่อเลื่อนได้ 30% ของความสูงแถบ (พี่ต่อสั่ง — เดิม 50%)
      const fadeDistance = Math.max(1, rect.height * 0.3);
      const opacity = Math.max(0, 1 - window.scrollY / fadeDistance);
      content.style.opacity = String(opacity);
      // เส้น header โปร่งเฉพาะตอนที่ยังเห็นรูปสไลด์ (ยังไม่จางหมด) — พอจางหมดเส้นกลับมาทันที
      // (เดิมรอจนขอบล่างแถบขึ้นมาถึง header → ระหว่างแอนิเมชันเกลี่ยไปหมวดหมู่ header ไม่มีเส้นอยู่พักหนึ่ง พี่ต่อทักว่าเส้นหาย)
      root.classList.toggle('hero-at-top', opacity > 0);
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
