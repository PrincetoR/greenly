'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

/** คัดลอกข้อความ (เช่น ที่อยู่ลูกค้า ไปแปะหน้ากล่อง/ระบบขนส่ง) */
export function CopyButton({ text, label = 'คัดลอก', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt('คัดลอกข้อความนี้', text);
        }
      }}
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink', done && 'text-ok', className)}
    >
      {done ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {done ? 'คัดลอกแล้ว' : label}
    </button>
  );
}
