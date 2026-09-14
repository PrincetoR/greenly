'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * เส้นเขียว 4px ตรึงบนสุดของจอ (พี่ต่อสั่ง — ลอง 2 และ 6 แล้วเอา 4):
 *  · อยู่บนสุดของหน้า = กลืนไปกับแถบสถานะสีเดียวกัน · เลื่อนลงแถบสถานะพ้นจอ → เหลือเส้นเขียว 4px คาดบน header
 *  · ระหว่างเปลี่ยนหน้า (คลิกลิงก์ภายใน) แถบขาวโปร่งวิ่งซ้าย→ขวาบนเส้น บอกว่ากำลังโหลด · หยุดเมื่อ pathname เปลี่ยน (หรือ 8 วิ กันค้าง)
 * App Router ไม่มี router event → จับคลิก <a> ภายในเอง · ลิงก์ที่ pathname เดิม (เปลี่ยนแค่ query) โชว์สั้น ๆ 600ms
 */
export function TopLine() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const guard = useRef(0);

  const start = (ms: number) => {
    setLoading(true);
    clearTimeout(guard.current);
    guard.current = window.setTimeout(() => setLoading(false), ms);
  };

  // pathname เปลี่ยน = หน้าใหม่มาแล้ว
  useEffect(() => {
    clearTimeout(guard.current);
    // ปิดแบบ defer ให้เห็นเส้นวิ่งถึงจังหวะสุดท้าย (ไม่ setState ตรง ๆ ใน effect)
    const t = window.setTimeout(() => setLoading(false), 120);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // ไม่เช็ค defaultPrevented — next/link จะ preventDefault เองเพื่อทำ client navigation อยู่แล้ว
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest('a[href]');
      if (!a || a.getAttribute('target') === '_blank' || a.hasAttribute('download')) return;
      const url = new URL((a as HTMLAnchorElement).href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) {
        if (url.search !== location.search) start(600);
        return;
      }
      start(8000);
    };
    const onPop = () => start(8000);
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      clearTimeout(guard.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-brand" aria-hidden data-loading={loading || undefined}>
      {loading && <div className="top-line-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-white/90 to-transparent" />}
    </div>
  );
}
