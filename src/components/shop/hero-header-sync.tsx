'use client';

import { useEffect } from 'react';

/**
 * หน้าแรกตอนอยู่บนสุด: ซ่อนเส้นขอบล่างของ header ให้แถบแบนเนอร์ขาวต่อเนื่องเป็นชิ้นเดียว
 * เลื่อนลงเมื่อไหร่ (แถบมุดใต้ header) เส้นกลับมาเหมือนหน้าอื่น · ใส่/ถอด class ที่ <html> — CSS อยู่ใน globals.css
 */
export function HeroHeaderSync() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.classList.toggle('hero-at-top', window.scrollY <= 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      root.classList.remove('hero-at-top');
    };
  }, []);
  return null;
}
