'use client';

import { useEffect } from 'react';

/**
 * หน้าแรก (จอ md+): หมุนล้อเมาส์นิดเดียวก็เลื่อนไปกลุ่มถัดไป/ก่อนหน้าทันที (แบบ fullpage)
 * เบราว์เซอร์เอง snap ไป "จุดที่ใกล้ที่สุด" หลังหยุดหมุน → หมุนน้อยจะเด้งกลับที่เดิม พี่ต่อบอกว่าต้องหมุนเยอะไป จึงจัดการเอง:
 *  จุดหยุด = บนสุด · หัวข้อแต่ละกลุ่ม (ตรงกับ scroll-margin-top ของ .snap-section) · ล่างสุด
 *  ล็อกระหว่างแอนิเมชัน ~700ms กันทัชแพดที่ยิง wheel ถี่ ๆ เลื่อนข้ามหลายกลุ่ม · กลุ่มที่สูงเกินจอปล่อยให้เลื่อนปกติ
 */
export function SnapWheel() {
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 48rem)');
    let locked = false;
    let unlock = 0;

    const targets = () => {
      const tops = [...document.querySelectorAll<HTMLElement>('.snap-section')].map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(el).scrollMarginTop || '0')));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return [...new Set([0, ...tops, max])].filter((t) => t >= 0 && t <= max).sort((a, b) => a - b);
    };

    const onWheel = (e: WheelEvent) => {
      if (!mq.matches || e.ctrlKey) return;
      if (locked) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 4) return;
      const y = window.scrollY;
      const list = targets();
      const down = e.deltaY > 0;
      // กลุ่มปัจจุบันสูงเกินจอและยังมีส่วนที่ซ่อนอยู่ในทิศที่จะเลื่อน → ปล่อยให้เลื่อนปกติ
      const idx = list.reduce((best, t, i) => (t <= y + 1 ? i : best), 0);
      const next = list[idx + 1];
      if (down && next !== undefined && next - y > window.innerHeight - 40) return;
      const target = down ? next : [...list].reverse().find((t) => t < y - 1);
      if (target === undefined) return;
      e.preventDefault();
      locked = true;
      window.scrollTo({ top: target, behavior: 'smooth' });
      clearTimeout(unlock);
      unlock = window.setTimeout(() => (locked = false), 700);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      clearTimeout(unlock);
    };
  }, []);
  return null;
}
