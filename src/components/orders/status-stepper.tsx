import { Check, PackageX, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/lib/types';
import { ORDER_STATUS_LABEL, ORDER_STEPS } from '@/lib/orders/labels';

/**
 * แถบขั้นตอนคำสั่งซื้อ: รอชำระ → รอแพ็ค → กำลังแพ็ค → จัดส่งแล้ว → ถึงมือลูกค้า
 * ตีกลับ/ยกเลิก = ทางแยก แสดงเป็นป้ายแทนขั้นที่ไปไม่ถึง (ตีกลับนับว่าผ่าน "จัดส่งแล้ว" มาแล้ว)
 */
export function StatusStepper({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  const branch = status === 'returned' || status === 'cancelled';
  // ตีกลับ = ส่งแล้วแต่ไม่ถึง → ผ่านถึงขั้น shipped · ยกเลิก = ไม่นับขั้นไหนต่อจากที่ไปถึง (ไม่รู้ว่าถึงไหน จึงถือว่าหยุดที่ขั้นแรก)
  const reached = status === 'returned' ? ORDER_STEPS.indexOf('shipped') : status === 'cancelled' ? -1 : ORDER_STEPS.indexOf(status);

  return (
    <ol className={cn('flex items-start', compact ? 'gap-1' : 'gap-2')} aria-label="ขั้นตอนคำสั่งซื้อ">
      {ORDER_STEPS.map((step, i) => {
        // ขั้นสุดท้าย (ถึงมือลูกค้า) ไม่มี "ถัดไป" → ถ้าถึงแล้วให้ติ๊กถูกเลย ไม่ค้างเป็นเลข 5
        const done = i < reached || (status === 'done' && i === reached);
        const current = i === reached && !branch && status !== 'done';
        const isLast = i === ORDER_STEPS.length - 1;
        // ขั้นสุดท้ายของทางแยก: แทน "ถึงมือลูกค้า" ด้วยตีกลับ/ยกเลิก
        const replaced = branch && isLast;
        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || current ? 'bg-brand' : 'bg-line')} aria-hidden />
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                  compact ? 'size-6' : 'size-8',
                  replaced ? 'border-danger bg-danger-soft text-danger' : done ? 'border-brand bg-brand text-white' : current ? 'border-brand bg-surface text-brand' : 'border-line bg-surface text-muted',
                )}
                aria-current={current ? 'step' : undefined}
              >
                {replaced ? status === 'returned' ? <PackageX className="size-3.5" aria-hidden /> : <XCircle className="size-3.5" aria-hidden /> : done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn('h-0.5 flex-1', isLast ? 'bg-transparent' : done ? 'bg-brand' : 'bg-line')} aria-hidden />
            </div>
            <span className={cn('mt-1.5 leading-tight', compact ? 'text-[11px]' : 'text-xs', replaced ? 'font-semibold text-danger' : current ? 'font-semibold text-brand' : done ? 'text-ink' : 'text-muted')}>
              {replaced ? ORDER_STATUS_LABEL[status] : ORDER_STATUS_LABEL[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
