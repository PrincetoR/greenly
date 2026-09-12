import { Suspense } from 'react';
import { ShopHeader } from '@/components/shop/header';
import { ShopFooter } from '@/components/shop/footer';
import { cartCount, readCart } from '@/lib/cart/cookie';
import { listCategories } from '@/lib/db/categories';
import { getSettings } from '@/lib/db/settings';

/** เปลือกฝั่งลูกค้า — ทุกหน้าใต้ (shop) ใช้ header/footer ชุดนี้ */
export default async function ShopLayout({ children }: LayoutProps<'/'>) {
  const [settings, categories, cart] = await Promise.all([getSettings(), listCategories({ activeOnly: true }), readCart()]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* header ใช้ useSearchParams จึงต้องมี Suspense ครอบตอน prerender */}
      <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
        <ShopHeader storeName={settings.storeName} categories={categories} cartCount={cartCount(cart)} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <ShopFooter settings={settings} />
    </div>
  );
}
