'use client';

import { useEffect } from 'react';

/**
 * หน้าแรก (จอ md+ ที่มีเมาส์/ทัชแพด): เลื่อนตามมือได้อิสระ พอหยุดค่อย "เกลี่ย" ไปหัวกลุ่มที่เลื่อนไปถึง
 *  · ทิศลง → กลุ่มถัดไปข้างหน้า (เลื่อนแค่นิดเดียวก็ไปต่อ ไม่เด้งกลับ) · ทิศขึ้น → กลุ่มก่อนหน้า
 *  · ถ้าเพิ่งผ่านหัวกลุ่มมาไม่เกิน 24px ถือว่าถึงกลุ่มนั้นแล้ว · ห่างเกินหนึ่งจอ (กลุ่มสูงมาก) ไม่บังคับ
 * ปิด scroll-snap ของเบราว์เซอร์ (class wheel-snap) เพราะแบบ mandatory เด้งกลับจุดใกล้สุด พี่ต่อไม่ชอบ · จอสัมผัสยังใช้ CSS snap
 */
export function SnapWheel() {
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)');
    const fine = window.matchMedia('(pointer: fine)');
    const root = document.documentElement;
    const active = () => mq.matches && fine.matches;
    const applyMode = () => root.classList.toggle('wheel-snap', active());
    applyMode();
    mq.addEventListener('change', applyMode);
    fine.addEventListener('change', applyMode);

    let lastY = window.scrollY;
    let settling = false;
    let timer = 0;
    const SLACK = 24;

    const targets = () => {
      const tops = [...document.querySelectorAll<HTMLElement>('.snap-section')].map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(el).scrollMarginTop || '0')));
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      return [...new Set([0, ...tops, max])].filter((t) => t >= 0 && t <= max).sort((a, b) => a - b);
    };

    const settle = () => {
      // data-no-settle ที่ <html> = ปิดการเกลี่ยชั่วคราว (e2e ใช้วัดตำแหน่งกลางทาง)
      if (!active() || settling || root.dataset.noSettle !== undefined) return;
      const y = window.scrollY;
      const dir = Math.sign(y - lastY);
      lastY = y;
      if (dir === 0) return;
      const list = targets();
      // ลง: จุดแรกที่ ≥ y − SLACK (ผ่านมานิดเดียวถือว่าถึงแล้ว) · ขึ้น: จุดสุดท้ายที่ ≤ y + SLACK
      const target = dir > 0 ? list.find((t) => t >= y - SLACK) : [...list].reverse().find((t) => t <= y + SLACK);
      if (target === undefined || Math.abs(target - y) < 1 || Math.abs(target - y) > window.innerHeight) return;
      settling = true;
      window.scrollTo({ top: target, behavior: 'smooth' });
      const done = () => {
        window.removeEventListener('scrollend', done);
        clearTimeout(guard);
        if (Math.abs(window.scrollY - target) < 2 && window.scrollY !== target) window.scrollTo({ top: target });
        lastY = window.scrollY;
        // ปล่อยหลังเฟรมถัดไป กัน scroll event ท้าย ๆ ของแอนิเมชันเราเองไปเรียก settle ซ้ำ
        requestAnimationFrame(() => (settling = false));
      };
      window.addEventListener('scrollend', done, { once: true });
      const guard = window.setTimeout(done, 900);
    };

    // ใช้ scrollend ถ้ามี (Chrome/Firefox) · fallback หน่วง 150ms หลัง scroll สุดท้าย
    const hasScrollEnd = 'onscrollend' in window;
    const onScroll = () => {
      if (settling || hasScrollEnd) return;
      clearTimeout(timer);
      timer = window.setTimeout(settle, 150);
    };
    const onScrollEnd = () => {
      if (!settling) settle();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (hasScrollEnd) window.addEventListener('scrollend', onScrollEnd);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
      mq.removeEventListener('change', applyMode);
      fine.removeEventListener('change', applyMode);
      root.classList.remove('wheel-snap');
      clearTimeout(timer);
    };
  }, []);
  return null;
}
