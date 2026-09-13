import Link from 'next/link';
import { SearchX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category, Product } from '@/lib/types';
import { ProductCard, ProductGrid } from './product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';
import { CategorySelect } from './category-select';

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
 * หมวดหมู่: จอ md+ เป็น card แถบข้างซ้าย · มือถือเป็น dropdown ในแถวเดียวกับช่องค้นหา
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

  const links = [
    { href: `/products${query({})}`, label: 'ทั้งหมด', active: !current },
    ...categories.map((c) => ({ href: `/category/${c.slug}${query({})}`, label: c.name, active: current?.id === c.id })),
  ];
  const currentHref = links.find((l) => l.active)?.href ?? links[0].href;
  const showHeading = Boolean(q || description);

  return (
    // ระยะจาก header ถึงเนื้อหา = 16px เท่าระยะระหว่างการ์ด
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 md:grid md:grid-cols-[220px_1fr] md:items-start md:gap-4">
      <aside className="hidden md:block">
        {/* ขอบบน card ตรงกับช่องค้นหา · แถวแรก "หมวดหมู่สินค้า" สูง 40 เท่าช่องค้นหา · คั่นด้วยเส้น */}
        <nav aria-label="หมวดหมู่สินค้า" className="sticky top-20 rounded-card bg-surface p-2 pt-0 ring-1 ring-line">
          {/* ขนาดใกล้เคียงหัวข้อหน้า (ย่อมกว่าหนึ่งขั้น) ให้ดูเป็นหัวข้อของคอลัมน์ ไม่ใช่รายการหนึ่ง */}
          <p className="flex h-10 items-center px-2 text-lg font-bold">หมวดหมู่สินค้า</p>
          <div className="mt-2 mb-[7px] border-t border-line" aria-hidden />
          <ul className="flex flex-col gap-0.5">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.active ? 'page' : undefined}
                  className={cn('block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', l.active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt')}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0">
        {/*
         * ไม่มีบรรทัดหัวข้อ (พี่ต่อเอาออก) — เหลือ h1 แบบ sr-only ให้ screen reader/SEO
         * ยกเว้นหน้าที่ต้องบอกบริบท (ผลค้นหา / สินค้าในโปร) จึงแสดงหัวข้อเล็ก ๆ เหนือช่องค้นหา
         */}
        {showHeading ? (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <p className="text-sm text-muted">{products.length} รายการ</p>
          </div>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}

        <div>
          {/* มือถือ: dropdown หมวดหมู่ · ค้นหา + ปุ่ม (สูงเท่ากัน h-10) · ขวาสุด: เรียงลำดับ */}
          <form action={basePath} className="flex flex-wrap items-center gap-2">
            <div className="w-full md:hidden">
              <CategorySelect options={links} value={currentHref} />
            </div>
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

          {/* ระยะจากแถบค้นหาถึงกริด = ระยะระหว่างการ์ด (gap-3 / sm:gap-4) */}
          <div className="mt-3 sm:mt-4">
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
    </div>
  );
}
