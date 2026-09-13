import Link from 'next/link';
import { SearchX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category, Product } from '@/lib/types';
import { ProductCard, ProductGrid } from './product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';
import { CategoryLayoutToggle, type CategoryLayout } from './category-layout-toggle';

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
 * หมวดหมู่แสดงได้ 2 แบบ: chips (แถบบน) หรือ aside (แถบข้างซ้าย จอ md+ · มือถือยังเป็น chips)
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
  layout = 'chips',
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
  layout?: CategoryLayout;
}) {
  const query = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === 'sort' && v === 'newest')) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  const aside = layout === 'aside';
  const links = [
    { href: `/products${query({})}`, label: 'ทั้งหมด', active: !current },
    ...categories.map((c) => ({ href: `/category/${c.slug}${query({})}`, label: c.name, active: current?.id === c.id })),
  ];

  return (
    <div className={cn('mx-auto max-w-6xl px-4 py-8', aside && 'md:grid md:grid-cols-[220px_1fr] md:gap-8')}>
      {/* แถบข้าง — เฉพาะโหมด aside บนจอ md+ */}
      {aside && (
        <aside className="hidden md:block">
          <nav aria-label="หมวดหมู่" className="sticky top-20">
            <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">หมวดหมู่</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={l.active ? 'page' : undefined}
                    className={cn('block rounded-lg px-3 py-2 text-sm font-medium transition-colors', l.active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt')}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted">{products.length} รายการ</p>
            <CategoryLayoutToggle current={layout} />
          </div>
        </div>

        {/* chips: เลื่อนแนวนอนบนมือถือ · py-1/px-1 เผื่อที่ให้ ring เพราะ overflow-x-auto จะ clip ขอบ */}
        <ul className={cn('-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:-mx-1 sm:flex-wrap sm:px-1', aside && 'md:hidden')}>
          {links.map((l) => (
            <li key={l.href} className="shrink-0">
              <Chip href={l.href} active={l.active}>
                {l.label}
              </Chip>
            </li>
          ))}
        </ul>

        {/* ซ้าย: ค้นหา + ปุ่ม (สูงเท่ากัน h-10) · ขวาสุด: เรียงลำดับ */}
        <form action={basePath} className="mt-4 flex flex-wrap items-center gap-2">
          <input type="search" name="q" defaultValue={q} placeholder="ค้นหาในรายการนี้" aria-label="ค้นหา" className="h-10 min-w-0 flex-1 sm:max-w-xs sm:flex-none sm:basis-72" />
          <button type="submit" className={buttonStyles({ variant: 'secondary' })}>
            ค้นหา
          </button>
          {q && (
            <Link href={`${basePath}${query({ q: undefined })}`} className={buttonStyles({ variant: 'ghost' })}>
              <X className="size-4" aria-hidden />
              ล้างคำค้น
            </Link>
          )}
          <select name="sort" defaultValue={sort} aria-label="เรียงลำดับ" className="ml-auto h-10 w-auto!">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
            <ProductGrid>{products.map((p, i) => (renderCard ? renderCard(p, i) : <ProductCard key={p.id} product={p} priority={i < 4} />))}</ProductGrid>
          )}
        </div>
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
