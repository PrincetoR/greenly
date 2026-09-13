import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * ตารางหลังบ้าน — ใช้คู่กับ card list บนมือถือ (ซ่อนตารางต่ำกว่า md)
 * ผู้เรียกครอบด้วย <div className="hidden md:block"> เอง เพื่อให้เลือกได้ว่าหน้าไหนอยากใช้ตารางทุกจอ
 */
export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface border border-line">
      <table className={cn('w-full text-sm', className)} {...rest} />
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('border-b border-line px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase', className)}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle last:border-b-0', className)} {...rest} />;
}
