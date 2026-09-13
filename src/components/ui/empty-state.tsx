import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

/** ไอคอนส่ง lucide element เข้ามา เช่น <Package /> — ขนาด/สีจัดให้ตรงนี้ */
export function EmptyState({
  icon = <Inbox />,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-surface px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-alt text-muted [&>svg]:size-7" aria-hidden>
        {icon}
      </span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
