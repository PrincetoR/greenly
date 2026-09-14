'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { bulkStartPacking } from '@/lib/actions/orders';
import { buttonStyles } from '@/components/ui/button';

/**
 * เลือกหลายใบในคิวจัดส่ง → พิมพ์ใบปะหน้าทีเดียว / เริ่มแพ็คทีเดียว
 * checkbox ของแต่ละแถวอยู่ในตารางฝั่ง server (children) — ตัวนี้ถือ state ว่าเลือกอะไรไว้ผ่าน event bubbling
 */
export function ShippingQueue({ ids, canPack, children }: { ids: string[]; canPack: boolean; children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const all = ids.length > 0 && selected.length === ids.length;

  return (
    <div
      onChange={(e) => {
        const t = e.target as HTMLInputElement;
        if (t.type !== 'checkbox' || !t.dataset.orderId) return;
        setSelected((s) => (t.checked ? [...new Set([...s, t.dataset.orderId!])] : s.filter((x) => x !== t.dataset.orderId)));
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={all} onChange={(e) => setSelected(e.target.checked ? ids : [])} aria-label="เลือกทั้งหมด" className="accent-brand" />
          เลือกทั้งหมด ({ids.length})
        </label>
        <span className="text-muted">เลือกแล้ว {selected.length}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={`/admin/shipping/labels?ids=${selected.join(',')}`}
            target="_blank"
            aria-disabled={selected.length === 0}
            className={buttonStyles({ variant: 'secondary', size: 'sm', className: selected.length === 0 ? 'pointer-events-none opacity-50' : '' })}
          >
            <Printer className="size-4" aria-hidden />
            พิมพ์ใบปะหน้า ({selected.length})
          </Link>
          {canPack && (
            <form action={bulkStartPacking}>
              {selected.map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              <button type="submit" disabled={selected.length === 0} className={buttonStyles({ size: 'sm' })}>
                เริ่มแพ็คที่เลือก ({selected.length})
              </button>
            </form>
          )}
        </div>
      </div>
      <SelectedContext.Provider value={selected}>{children}</SelectedContext.Provider>
    </div>
  );
}

import { createContext, useContext } from 'react';
const SelectedContext = createContext<string[]>([]);

/** checkbox ต่อแถว — อ่าน state จาก ShippingQueue ให้ "เลือกทั้งหมด" สะท้อนลงมา */
export function RowCheckbox({ id }: { id: string }) {
  const selected = useContext(SelectedContext);
  return <input type="checkbox" data-order-id={id} checked={selected.includes(id)} onChange={() => {}} aria-label={`เลือก ${id}`} className="accent-brand" />;
}
