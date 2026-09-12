'use client';

import { useEffect, useState } from 'react';
import { humanCountdown } from '@/lib/datetime';

/**
 * นับถอยหลังถึงเวลาที่กำหนด — เริ่มจากค่าที่ server คำนวณ (initial) เพื่อไม่ให้ hydration ไม่ตรง
 * แล้วค่อยอัปเดตทุกนาทีบน client
 */
export function Countdown({ to, initial, prefix = 'เหลืออีก' }: { to: string; initial: string | null; prefix?: string }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    const tick = () => setText(humanCountdown(to, new Date()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [to]);
  if (!text) return null;
  return (
    <span>
      {prefix} <span className="font-semibold tabular-nums">{text}</span>
    </span>
  );
}
