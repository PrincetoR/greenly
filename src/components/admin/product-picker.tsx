'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/select';
import { formatBaht } from '@/lib/money';
import type { Category, Product } from '@/lib/types';
import { ProductImage } from '@/components/product-image';

/**
 * เลือกสินค้าหลายตัวจากรายการยาว ๆ — ค้นหา/กรองหมวด แล้วติ๊ก
 * ส่งค่าออกเป็น selected ids ผู้เรียกเป็นคนใส่ hidden input เอง
 */
export function ProductPicker({
  products,
  categories,
  selected,
  onChange,
}: {
  products: Product[];
  categories: Category[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const set = useMemo(() => new Set(selected), [selected]);
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => (!cat || p.categoryId === cat) && (!needle || `${p.name} ${p.sku}`.toLowerCase().includes(needle)));
  }, [products, q, cat]);

  const toggle = (id: string) => onChange(set.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const allShownSelected = shown.length > 0 && shown.every((p) => set.has(p.id));

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ / SKU" aria-label="ค้นหาสินค้า" className="min-w-0 flex-1" />
        <Select value={cat} onChange={setCat} aria-label="กรองหมวดหมู่" className="shrink-0" options={[{ value: '', label: 'ทุกหมวด' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
        <button
          type="button"
          onClick={() => onChange(allShownSelected ? selected.filter((id) => !shown.some((p) => p.id === id)) : [...new Set([...selected, ...shown.map((p) => p.id)])])}
          className="text-sm font-medium text-brand hover:underline"
        >
          {allShownSelected ? 'เอาที่แสดงออก' : 'เลือกที่แสดงทั้งหมด'}
        </button>
      </div>

      <ul className="max-h-72 overflow-y-auto">
        {shown.length === 0 && <li className="p-4 text-center text-sm text-muted">ไม่พบสินค้า</li>}
        {shown.map((p) => {
          const on = set.has(p.id);
          return (
            <li key={p.id}>
              <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-surface-alt', on && 'bg-brand-soft/60')}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="size-4 accent-brand" />
                <ProductImage src={p.images[0]} alt="" className="size-9 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-muted">
                    {catName.get(p.categoryId) ?? '—'} · {formatBaht(p.price)}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-line px-3 py-2 text-xs text-muted">
        เลือกแล้ว <span className="font-semibold text-ink">{selected.length}</span> รายการ
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="ml-2 text-danger hover:underline">
            ล้างทั้งหมด
          </button>
        )}
      </p>
    </div>
  );
}
