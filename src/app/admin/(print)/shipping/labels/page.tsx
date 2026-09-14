import { requirePermission } from '@/lib/auth/session';
import { listOrders } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { formatBaht } from '@/lib/money';
import { formatDate } from '@/lib/datetime';
import { carrierById } from '@/lib/shipping/carriers';
import { PrintButton } from '@/components/admin/print-button';
import { Package, Phone } from 'lucide-react';

export const metadata = { title: 'ใบปะหน้ากล่อง' };

/**
 * ใบปะหน้ากล่อง — พิมพ์ทีละหลายใบ (?ids=a,b,c) ขนาดใบละครึ่ง A4 (2 ใบ/หน้า) ตัดแปะได้เลย
 * มี: ผู้รับ (ตัวใหญ่) · ผู้ส่ง · เลขที่ออเดอร์แบบบาร์โค้ดจำลอง · COD เก็บเงินเท่าไหร่ · รายการสินค้าให้คนแพ็คเช็ค
 */
export default async function LabelsPage({ searchParams }: PageProps<'/admin/shipping/labels'>) {
  await requirePermission('order.manage');
  const sp = await searchParams;
  const ids = String(sp.ids ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const [orders, settings] = await Promise.all([listOrders(), getSettings()]);
  const selected = ids.map((id) => orders.find((o) => o.id === id)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const { shipping, storeName } = settings;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">ใบปะหน้ากล่อง</h1>
          <p className="text-sm text-muted">{selected.length} ใบ · A4 แนวตั้ง ใบละครึ่งหน้า · ตั้งค่าผู้ส่งได้ที่ จัดส่ง › ตั้งค่า</p>
        </div>
        <PrintButton />
      </div>

      {selected.length === 0 ? (
        <p className="text-sm text-muted">ไม่พบออเดอร์ที่เลือก</p>
      ) : (
        <div className="grid gap-4 print:block">
          {selected.map((o) => {
            const qty = o.lines.reduce((s, l) => s + l.qty, 0);
            return (
              <article key={o.id} className="label-sheet rounded-card bg-white p-5 text-ink border border-line print:h-[148mm] print:rounded-none print:border-2 print:border-black print:p-6 print:break-inside-avoid" aria-label={`ใบปะหน้า ${o.orderNo}`}>
                <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-line pb-3 print:border-black">
                  <div className="text-xs">
                    <p className="font-semibold text-muted uppercase print:text-black">ผู้ส่ง</p>
                    <p className="font-bold">{shipping.senderName || storeName}</p>
                    <p>{shipping.senderAddress}</p>
                    <p>โทร {shipping.senderPhone || settings.contact.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold tracking-wider">{o.orderNo}</p>
                    <Barcode value={o.orderNo} />
                    <p className="text-xs text-muted print:text-black">{formatDate(o.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted uppercase print:text-black">ผู้รับ</p>
                    <p className="text-2xl font-bold leading-tight">{o.customer.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-lg font-semibold">
                      <Phone className="size-4" aria-hidden />
                      {o.customer.phone}
                    </p>
                    <p className="mt-2 text-base leading-snug whitespace-pre-line">{o.customer.address}</p>
                  </div>
                  <div className="w-40 shrink-0 text-right text-sm">
                    {o.paymentMethod === 'cod' ? (
                      <div className="rounded-md bg-warn-soft p-3 print:border-2 print:border-black print:bg-white">
                        <p className="text-xs font-semibold uppercase">เก็บเงินปลายทาง</p>
                        <p className="text-2xl font-bold">{formatBaht(o.total)}</p>
                      </div>
                    ) : (
                      <div className="rounded-md bg-ok-soft p-3 print:border-2 print:border-black print:bg-white">
                        <p className="text-xs font-semibold uppercase">ชำระแล้ว</p>
                        <p className="font-bold">ไม่ต้องเก็บเงิน</p>
                      </div>
                    )}
                    {o.shipment && (
                      <p className="mt-2 text-xs">
                        {carrierById(o.shipment.carrier).name}
                        <span className="block font-mono font-semibold">{o.shipment.trackingNo}</span>
                      </p>
                    )}
                    {o.shipment?.weightGrams && <p className="mt-1 text-xs text-muted print:text-black">{o.shipment.weightGrams} กรัม · กล่อง {o.shipment.boxSize ?? '-'}</p>}
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-3 text-xs print:border-black">
                  <p className="flex items-center gap-1 font-semibold">
                    <Package className="size-3.5" aria-hidden />
                    รายการในกล่อง ({qty} ชิ้น) — ติ๊กเมื่อหยิบครบ
                  </p>
                  <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    {o.lines.map((l, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="inline-block size-3 border border-ink print:border-black" aria-hidden />
                        <span className="truncate">
                          {l.name} × {l.qty}
                          {l.isGift && ' (ของแถม)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {o.note && <p className="mt-2 text-muted print:text-black">หมายเหตุลูกค้า: {o.note}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** บาร์โค้ดจำลอง (แถบกว้างต่างกันตามอักขระ) — ของจริงใช้ Code128 ของขนส่ง/ระบบคลัง */
function Barcode({ value }: { value: string }) {
  const bars: number[] = [];
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    bars.push(1 + (c % 3), 1 + ((c >> 2) % 2));
  }
  let x = 0;
  return (
    <svg viewBox={`0 0 ${bars.reduce((s, b) => s + b + 1, 0)} 24`} className="ml-auto mt-1 h-8 w-40" aria-hidden preserveAspectRatio="none">
      {bars.map((w, i) => {
        const el = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w} height={24} fill="#000" /> : null;
        x += w + 1;
        return el;
      })}
    </svg>
  );
}
