import Link from 'next/link';
import { SearchX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category, Product } from '@/lib/types';
import { ProductCard, ProductGrid } from './product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'price-asc', label: 'ราคาต่ำไปสูง' },
  { value: 'price-desc', label: 'ราคาสูงไปต่ำ' },
  { value: 'name', label: 'ชื่อ ก–ฮ' },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export function parseSort(value: unknown): SortValue {
  return SORT_OPTIONS.some((o) => o.value === value) ? (value as SortValue) : 'newest';
}

/**
 * หน้ารายการสินค้า ใช้ร่วมกันระหว่าง /products และ /category/[slug]
 * ตัวกรองทั้งหมดเป็น GET query → แชร์ลิงก์ได้ กด back ได้ ไม่ต้องมี client state
 */
export function ProductListing({
  title,
  description,
  products,
  categories,
  current,
  q,
  sort,
  basePath,
  renderCard,
}: {
  title: string;
  description?: string;
  products: Product[];
  categories: Category[];
  current?: Category;
  q: string;
  sort: SortValue;
  basePath: string;
  /** ให้ phase โปรโมชันเสียบการ์ดที่มีราคาโปรได้โดยไม่แก้ไฟล์นี้ */
  renderCard?: (product: Product, index: number) => React.ReactNode;
}) {
  const query = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'sort' && v === 'newest')) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <p className="text-sm text-muted">{products.length} รายการ</p>
      </div>

      {/* หมวดหมู่เป็น chip เลื่อนแนวนอนบนมือถือ */}
      <ul className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        <li className="shrink-0">
          <Chip href={`/products${query({})}`} active={!current}>
            ทั้งหมด
          </Chip>
        </li>
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <Chip href={`/category/${c.slug}${query({})}`} active={current?.id === c.id}>
              {c.name}
            </Chip>
          </li>
        ))}
      </ul>

      <form action={basePath} className="mt-4 flex flex-wrap gap-2">
        <input type="search" name="q" defaultValue={q} placeholder="ค้นหาในรายการนี้…" aria-label="ค้นหา" className="min-w-0 flex-1 sm:max-w-xs" />
        <select name="sort" defaultValue={sort} aria-label="เรียงลำดับ" className="w-auto!">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonStyles({ variant: 'secondary' })}>
          ค้นหา
        </button>
        {q && (
          <Link href={`${basePath}${query({ q: undefined })}`} className={buttonStyles({ variant: 'ghost' })}>
            <X className="size-4" aria-hidden />
            ล้างคำค้น
          </Link>
        )}
      </form>

      <div className="mt-6">
        {products.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={q ? `ไม่พบสินค้าที่ตรงกับ "${q}"` : 'ยังไม่มีสินค้าในหมวดนี้'}
            description="ลองใช้คำค้นอื่น หรือดูสินค้าทั้งหมด"
            action={
              <Link href="/products" className={buttonStyles()}>
                ดูสินค้าทั้งหมด
              </Link>
            }
          />
        ) : (
          <ProductGrid>
            {products.map((p, i) => (renderCard ? renderCard(p, i) : <ProductCard key={p.id} product={p} priority={i < 4} />))}
          </ProductGrid>
        )}
      </div>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'block rounded-full px-4 py-1.5 text-sm font-medium ring-1 transition-colors',
        active ? 'bg-brand text-white ring-brand' : 'bg-surface text-ink ring-line hover:bg-brand-soft hover:text-brand',
      )}
    >
      {children}
    </Link>
  );
}
