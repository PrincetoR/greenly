import { formatDateTime } from '@/lib/datetime';
import type { OrderEvent } from '@/lib/types';

/** ประวัติเหตุการณ์ของออเดอร์ (หลังบ้าน) — ล่าสุดอยู่บน */
export function OrderHistory({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">ยังไม่มีบันทึก</p>;
  return (
    <ol className="flex flex-col gap-3">
      {[...events].reverse().map((e, i) => (
        <li key={e.at + i} className="text-sm">
          <p className="leading-tight">{e.note}</p>
          <p className="mt-0.5 text-xs text-muted">
            {formatDateTime(e.at)} · {e.by === 'customer' ? 'ลูกค้า' : e.by === 'system' ? 'ระบบ' : e.by}
          </p>
        </li>
      ))}
    </ol>
  );
}
