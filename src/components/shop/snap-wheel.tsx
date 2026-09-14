'use client';

import { useEffect } from 'react';

/**
 * หน้าแรก (จอ md+ ที่มีเมาส์/ทัชแพด): เลื่อนตามมืออิสระ พอมือหยุดค่อย "เกลี่ย" ไปหัวกลุ่มที่เลื่อนไปถึง
 *  · ทิศลง → กลุ่มถัดไปข้างหน้า (เลื่อนแค่นิดเดียวก็ไปต่อ ไม่เด้งกลับ) · ทิศขึ้น → กลุ่มก่อนหน้า
 *  · ถ้าเพิ่งผ่านหัวกลุ่มมาไม่เกิน 24px ถือว่าถึงกลุ่มนั้นแล้ว · ห่างเกินหนึ่งจอ (กลุ่มสูงมาก) ไม่บังคับ
 * แอนิเมชันเกลี่ยเขียนเอง (ไม่ใช้ scrollTo smooth ที่เริ่มจากหยุดนิ่งแล้วเด้ง): เริ่มด้วยความเร็วเท่าที่กำลังเลื่อนอยู่
 * แล้วชะลอลงจนหยุดพอดีที่จุดหมาย (Hermite: p'(0)=v ปัจจุบัน, p'(1)=0) — ต่อเนื่องจากมือ ไม่มีสะดุด (พี่ต่อสั่ง)
 * ปิด scroll-snap ของเบราว์เซอร์ (class wheel-snap) · จอสัมผัสยังใช้ CSS snap
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

    const SLACK = 24;
    const GESTURE_GAP = 90; // ms ไม่มี wheel = มือหยุดแล้ว
    let lastSettled = window.scrollY;
    let samples: { y: number; t: number }[] = [];
    let raf = 0;
    let animating = false;
    let gestureTimer = 0;
    let idleTimer = 0;

    const targets = () => {
      const tops = [...document.querySelectorAll<HTMLElement>('.snap-section')].map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(el).scrollMarginTop || '0')));
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      return [...new Set([0, ...tops, max])].filter((t) => t >= 0 && t <= max).sort((a, b) => a - b);
    };

    /** ความเร็วปัจจุบัน (px/ms) จากตัวอย่างตำแหน่งล่าสุด ~100ms */
    const velocity = () => {
      const now = performance.now();
      const recent = samples.filter((s) => now - s.t <= 120);
      if (recent.length < 2) return 0;
      const a = recent[0];
      const b = recent[recent.length - 1];
      return b.t === a.t ? 0 : (b.y - a.y) / (b.t - a.t);
    };

    const cancelAnim = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      animating = false;
    };

    /** เกลี่ยจาก y0 ด้วยความเร็ว v0 ไป target · ชะลอสม่ำเสมอจนหยุดพอดี */
    const animateTo = (target: number, v0: number) => {
      const y0 = window.scrollY;
      const dist = target - y0;
      if (Math.abs(dist) < 1) return;
      // ความเร็วที่พุ่งไปทางเดียวกับจุดหมายเท่านั้นที่นำมาต่อ · ระยะเวลา = ชะลอจาก v0 ถึง 0 พอดีระยะ (2d/v) จำกัด 280–900ms
      const toward = Math.sign(v0) === Math.sign(dist) ? Math.abs(v0) : 0;
      const D = Math.min(900, Math.max(280, toward > 0.05 ? (2 * Math.abs(dist)) / toward : 450));
      // m0 = ความชันตอนเริ่ม (px ต่อหน่วย t) · ไม่ให้เกิน 2·dist ไม่งั้นวิ่งเลยแล้วย้อนกลับ
      const m0 = Math.min(toward * D, 2 * Math.abs(dist)) * Math.sign(dist);
      const start = performance.now();
      animating = true;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / D);
        const t2 = t * t;
        const t3 = t2 * t;
        // มีความเร็วอยู่ → Hermite ต่อความเร็วเดิมแล้วชะลอ · หยุดนิ่งอยู่แล้ว (ล้อเมาส์ทีละติ๊ก) → ease-out ออกตัวทันทีไม่ค่อย ๆ เร่ง (ไม่งั้นรู้สึกเหมือนเด้ง)
        const p = toward > 0.05 ? (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * target : y0 + dist * (1 - (1 - t) ** 3);
        window.scrollTo(0, t >= 1 ? target : p);
        if (t < 1) raf = requestAnimationFrame(step);
        else {
          raf = 0;
          animating = false;
          lastSettled = target;
          samples = [];
        }
      };
      raf = requestAnimationFrame(step);
    };

    const settle = () => {
      if (!active() || animating || root.dataset.noSettle !== undefined) return;
      const y = window.scrollY;
      const v = velocity();
      const dir = Math.abs(v) > 0.02 ? Math.sign(v) : Math.sign(y - lastSettled);
      if (dir === 0) return;
      const list = targets();
      const target = dir > 0 ? list.find((t) => t >= y - SLACK) : [...list].reverse().find((t) => t <= y + SLACK);
      if (target === undefined || Math.abs(target - y) > window.innerHeight) return;
      if (Math.abs(target - y) < 1) {
        lastSettled = target;
        return;
      }
      animateTo(target, v);
    };

    const onWheel = () => {
      if (!active()) return;
      // มือขยับอีก → ยกเลิกการเกลี่ย ให้มือคุม แล้วนัดเกลี่ยใหม่หลังมือหยุด
      cancelAnim();
      clearTimeout(gestureTimer);
      gestureTimer = window.setTimeout(settle, GESTURE_GAP);
    };
    const onScroll = () => {
      samples.push({ y: window.scrollY, t: performance.now() });
      if (samples.length > 8) samples.shift();
      if (animating) return;
      // เลื่อนด้วยวิธีอื่น (ลาก scrollbar/คีย์บอร์ด) ไม่มี wheel → เกลี่ยหลังนิ่ง 150ms
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(settle, 150);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', applyMode);
      fine.removeEventListener('change', applyMode);
      root.classList.remove('wheel-snap');
      cancelAnim();
      clearTimeout(gestureTimer);
      clearTimeout(idleTimer);
    };
  }, []);
  return null;
}
