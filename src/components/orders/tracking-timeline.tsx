import { CheckCircle2, Circle, MapPin, PackageX, Truck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/datetime';
import type { TrackingEvent } from '@/lib/shipping/tracking';

/** ไทม์ไลน์พัสดุ (ล่าสุดอยู่บน) — ใช้ทั้งหน้าลูกค้าและหลังบ้าน */
export function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">ยังไม่มีข้อมูลจากขนส่ง</p>;
  return (
    <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
      {events.map((e, i) => {
        const Icon = e.kind === 'delivered' ? CheckCircle2 : e.kind === 'returned' ? PackageX : e.kind === 'out' ? Truck : e.kind === 'transit' ? MapPin : Circle;
        const latest = i === 0;
        return (
          <li key={e.at + e.title} className="relative text-sm">
            <span className={cn('absolute -left-[29px] top-0.5 flex size-4 items-center justify-center rounded-full bg-surface', latest ? (e.kind === 'returned' ? 'text-danger' : e.kind === 'delivered' ? 'text-ok' : 'text-brand') : 'text-muted')} aria-hidden>
              <Icon className="size-4" />
            </span>
            <p className={cn('leading-tight', latest ? 'font-semibold' : '')}>{e.title}</p>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(e.at)} · {e.location}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
