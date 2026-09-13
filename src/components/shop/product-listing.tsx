import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Category, Product } from '@/lib/types';
import { ProductCard, ProductGrid } from './product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';
import { ListingToolbar } from './listing-toolbar';
import type { SortValue } from './sort-options';

export { SORT_OPTIONS, parseSort, type SortValue } from './sort-options';

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

  return (
    /*
     * ตอนเลื่อน (จอ md+): card หมวดหมู่ + แถว [หัวข้อ ค้นหา เรียงลำดับ] ติดใต้ header (65px = h-16 + border) · การ์ดสินค้ามุดใต้แถวนี้
     * ระยะ 16px เหนือ/ใต้แถวอยู่ใน wrapper ที่ sticky ด้วย (pt-4/pb-4) → gap เท่าตอนปกติทั้งตอนอยู่นิ่งและตอนติด
     * sticky อยู่ที่ตัว grid item (aside) ไม่ใช่ลูกข้างใน — ลูกจะขยับได้แค่ในช่องของตัวเองซึ่งสูงเท่าเนื้อหา
     * มือถือไม่ sticky (แถบสูงเกินครึ่งจอ)
     */
    <div className="mx-auto max-w-6xl px-4 pb-8 md:grid md:grid-cols-[var(--aside-w)_1fr] md:items-start md:gap-4">
      <aside className="sticky top-[65px] hidden pt-4 md:block">
        {/* ขอบบน card ตรงกับช่องค้นหา · แถวแรก "หมวดหมู่สินค้า" สูง 40 เท่าช่องค้นหา · คั่นด้วยเส้น */}
        <nav aria-label="หมวดหมู่สินค้า" className="rounded-card bg-surface p-2 pt-0 ring-1 ring-line">
          {/* ขนาดใกล้เคียงหัวข้อหน้า (ย่อมกว่าหนึ่งขั้น) ให้ดูเป็นหัวข้อของคอลัมน์ ไม่ใช่รายการหนึ่ง */}
          <p className="flex h-10 items-center px-2 text-lg font-bold">หมวดหมู่สินค้า</p>
          {/* เส้นคั่นอยู่ที่ 40px = ขอบล่างช่องค้นหา · เว้น 15px ให้ "ทั้งหมด" เริ่มที่ 56 = ขอบบนการ์ดสินค้า */}
          <div className="mb-[15px] border-t border-line" aria-hidden />
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.active ? 'page' : undefined}
                  className={cn('block rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors', l.active ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-surface-alt')}
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
         * หัวข้อ + ค้นหา + เรียงลำดับ แถวเดียว (ระดับ "หมวดหมู่สินค้า" ของ card ซ้าย)
         * ติดใต้ header ตอนเลื่อน พื้นโปร่ง 85% + เบลอบาง ๆ ให้การ์ดที่มุดใต้ดูนุ่ม ไม่แข็ง
         */}
        <div className="pt-4 pb-3 sm:pb-4 md:sticky md:top-[65px] md:z-20 md:bg-page/85 md:backdrop-blur-sm">
          <ListingToolbar
            title={title}
            description={description}
            count={products.length}
            basePath={basePath}
            q={q}
            sort={sort}
            categoryOptions={links}
            currentCategoryHref={currentHref}
          />
        </div>

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
  );
}
