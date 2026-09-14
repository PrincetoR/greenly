'use client';

import { useEffect, useState } from 'react';
import { clockCountdown } from '@/lib/datetime';

/**
 * นับถอยหลังถึงเวลาที่กำหนด แบบนาฬิกา "13 วัน 23:59:59" — เริ่มจากค่าที่ server คำนวณ (initial = clockCountdown) เพื่อไม่ให้ hydration ไม่ตรง
 * แล้วเดินทุกวินาทีบน client (พี่ต่อขอเห็นวินาที)
 */
export function Countdown({ to, initial, prefix = 'เหลืออีก' }: { to: string; initial: string | null; prefix?: string }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    const tick = () => setText(clockCountdown(to, new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (!text) return null;
  return (
    <span>
      {prefix} <span className="font-semibold tabular-nums">{text}</span>
    </span>
  );
}
