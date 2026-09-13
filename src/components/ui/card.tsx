import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** กล่องพื้นขาวขอบบาง — หน่วยพื้นฐานของทั้งหน้าร้านและหลังบ้าน */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-surface border border-line', className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
