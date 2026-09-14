import Link from 'next/link';
import { SearchX } from 'lucide-react';
import type { Category, Product } from '@/lib/types';
import { countActiveByCategory } from '@/lib/db/products';
import { ProductCard, ProductGrid } from './product-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';
import { ListingToolbar } from './listing-toolbar';
import { CategoryAside } from './category-aside';
import type { SortValue } from './sort-options';

export { SORT_OPTIONS, parseSort, type SortValue } from './sort-options';

/**
 * หน้ารายการสินค้า ใช้ร่วมกันระหว่าง /products และ /category/[slug]
 * ตัวกรองทั้งหมดเป็น GET query → แชร์ลิงก์ได้ กด back ได้ ไม่ต้องมี client state
 * หมวดหมู่: จอ md+ เป็น card แถบข้างซ้าย (ชื่อ + จำนวนสินค้าชิดขวา — พี่ต่อสั่ง 2026-09-15) · มือถือเป็น dropdown ใต้หัวข้อ
 */
export async function ProductListing({
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

  // จำนวน = สินค้าที่เปิดขายทั้งหมดในหมวด (ไม่ใช่ผลค้นหา) ให้ตัวเลขนิ่งตอนพิมพ์ค้น
  const counts = await countActiveByCategory();
  const links = [
    { href: `/products${query({})}`, label: 'ทั้งหมด', count: counts.all, active: !current },
    ...categories.map((c) => ({ href: `/category/${c.slug}${query({})}`, label: c.name, count: counts.byCategory[c.id] ?? 0, active: current?.id === c.id })),
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
      <CategoryAside links={links} />

      <div className="min-w-0">
        {/*
         * หัวข้อ + ค้นหา + เรียงลำดับ แถวเดียว (ระดับ "หมวดหมู่สินค้า" ของ card ซ้าย)
         * ติดใต้ header ตอนเลื่อน: พื้นทึบธรรมดา ไม่มีเบลอ/ไล่จาง (พี่ต่อลองแล้วไม่เอา)
         * -mx-1/px-1 ขยายแถบให้คลุม ring ของการ์ดที่วาดล้นออกนอกคอลัมน์ 1px (ไม่งั้นเห็นเส้นข้าง)
         */}
        <div className="pt-4 pb-3 sm:pb-4 md:sticky md:top-[65px] md:z-20 md:-mx-1 md:bg-page md:px-1">
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
          <ProductGrid snap>{products.map((p, i) => (renderCard ? renderCard(p, i) : <ProductCard key={p.id} product={p} priority={i < 4} />))}</ProductGrid>
        )}
      </div>
    </div>
  );
}
