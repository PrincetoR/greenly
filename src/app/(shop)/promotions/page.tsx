import Link from 'next/link';
import { Tag } from 'lucide-react';
import type { Category, Product, Promotion } from '@/lib/types';
import { listCategories } from '@/lib/db/categories';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { decodeSlug } from '@/lib/validation/common';
import { PromoCard } from '@/components/shop/promo-card';
import { CategoryAside } from '@/components/shop/category-aside';
import { CategoryPicker } from '@/components/shop/category-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'โปรโมชัน' };

/**
 * หมวดที่โปรเกี่ยวข้อง: ทั้งร้าน = null (นับ/แสดงในทุกหมวด เพราะใช้ได้ทั้งหมด — พี่ต่อสั่ง) · ระบุหมวด = หมวดนั้น · ระบุสินค้า = หมวดของสินค้าเหล่านั้น
 */
function promoCategoryIds(promo: Promotion, products: Product[]): Set<string> | null {
  if (promo.scope.kind === 'all') return null;
  if (promo.scope.kind === 'categories') return new Set(promo.scope.ids);
  const ids = new Set(promo.scope.ids);
  return new Set(products.filter((p) => ids.has(p.id)).map((p) => p.categoryId));
}

/**
 * หน้าโปรโมชัน โครงเดียวกับหน้ารายการสินค้า (พี่ต่อสั่ง 2026-09-15): card หมวดหมู่ซ้าย (ตัวเลข = จำนวนโปรที่เข้าร่วม)
 * เลือกหมวด (?category=slug) → โปรที่ใช้กับหมวดนั้น + โปรทั้งร้าน · มือถือเป็น dropdown ใต้หัวข้อ
 * ไม่มีหัวข้อย่อย "กำลังใช้งาน / เร็ว ๆ นี้" (พี่ต่อเอาออก) — เรียง live ก่อน scheduled ป้ายสถานะอยู่บนการ์ดแล้ว
 */
export default async function PromotionsPage({ searchParams }: PageProps<'/promotions'>) {
  const sp = await searchParams;
  const [{ promotions, usage, now }, categories, products] = await Promise.all([loadPromotionContext(), listCategories({ activeOnly: true }), listProducts()]);
  const slug = typeof sp.category === 'string' ? decodeSlug(sp.category) : '';
  const current: Category | undefined = slug ? categories.find((c) => c.slug === slug) : undefined;

  const visible = promotions
    .map((p) => ({ p, status: promotionStatus(p, now, usage[p.id]), cats: promoCategoryIds(p, products) }))
    .filter((x) => x.status === 'live' || x.status === 'scheduled');
  const inCategory = (x: (typeof visible)[number], id: string) => x.cats === null || x.cats.has(id);
  const shown = current ? visible.filter((x) => inCategory(x, current.id)) : visible;
  const live = shown.filter((x) => x.status === 'live').sort((a, b) => a.p.endsAt.localeCompare(b.p.endsAt));
  const upcoming = shown.filter((x) => x.status === 'scheduled').sort((a, b) => a.p.startsAt.localeCompare(b.p.startsAt));

  const links = [
    { href: '/promotions', label: 'ทั้งหมด', count: visible.length, active: !current },
    ...categories.map((c) => ({ href: `/promotions?category=${encodeURIComponent(c.slug)}`, label: c.name, count: visible.filter((x) => inCategory(x, c.id)).length, active: current?.id === c.id })),
  ];
  const currentHref = links.find((l) => l.active)?.href ?? '/promotions';
  const title = current ? current.name : 'โปรโมชันทั้งหมด';


  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 md:grid md:grid-cols-[var(--aside-w)_1fr] md:items-start md:gap-4">
      <CategoryAside links={links} />

      <div className="min-w-0">
        {/* แถวหัวข้อ ระดับเดียวกับ "หมวดหมู่สินค้า" ของ card ซ้าย (สูง 40) · ติดใต้ header ตอนเลื่อนเหมือนหน้ารายการ */}
        <div className="pt-4 pb-3 sm:pb-4 md:sticky md:top-[65px] md:z-20 md:-mx-1 md:bg-page md:px-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-10 min-w-0 basis-full items-baseline gap-2 md:basis-auto">
              <h1 className="truncate text-2xl leading-10 font-bold">{title}</h1>
              <span className="shrink-0 text-sm text-muted">{shown.length} โปรโมชัน</span>
            </div>
            <p className="hidden text-sm text-muted lg:block lg:ml-auto">ส่วนลดมีผลอัตโนมัติเมื่อใส่สินค้าลงตะกร้า · คูปองกรอกโค้ดตอนชำระเงิน</p>
            {/* มือถือ: หมวดหมู่เป็น dropdown ใต้หัวข้อ (เหมือนหน้ารายการสินค้า) */}
            <div className="w-full md:hidden">
              <CategoryPicker options={links.map((l) => ({ value: l.href, label: `${l.label} (${l.count})` }))} value={currentHref} />
            </div>
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={<Tag />}
            title={current ? `ยังไม่มีโปรโมชันในหมวด ${current.name}` : 'ตอนนี้ยังไม่มีโปรโมชัน'}
            description={current ? 'ลองดูหมวดอื่น หรือโปรทั้งหมด' : 'ติดตามโปรใหม่ได้ที่นี่'}
            action={
              <Link href={current ? '/promotions' : '/products'} className={buttonStyles()}>
                {current ? 'ดูโปรโมชันทั้งหมด' : 'ดูสินค้าทั้งหมด'}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[...live, ...upcoming].map(({ p, status }) => (
              <PromoCard key={p.id} promo={p} status={status} usage={usage[p.id]} categories={categories} products={products} now={now} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
