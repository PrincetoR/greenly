import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONE = {
  info: 'bg-info-soft text-info',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
} as const;

export function Alert({
  tone = 'info',
  className,
  children,
}: {
  tone?: keyof typeof TONE;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-lg px-4 py-3 text-sm', TONE[tone], className)}>
      {children}
    </div>
  );
}
