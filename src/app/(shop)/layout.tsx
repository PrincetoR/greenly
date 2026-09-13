import { ShopHeader } from '@/components/shop/header';
import { ShopFooter } from '@/components/shop/footer';
import { cartCount, readCart } from '@/lib/cart/storage';
import { listCategories } from '@/lib/db/categories';
import { getSettings } from '@/lib/db/settings';
import { readMyWishlist } from '@/lib/wishlist/storage';

/** เปลือกฝั่งลูกค้า — ทุกหน้าใต้ (shop) ใช้ header/footer ชุดนี้ */
export default async function ShopLayout({ children }: LayoutProps<'/'>) {
  const [settings, categories, cart, wishlist] = await Promise.all([getSettings(), listCategories({ activeOnly: true }), readCart(), readMyWishlist()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <ShopHeader storeName={settings.storeName} categories={categories} cartCount={cartCount(cart)} wishlistCount={wishlist.length} />
      <main className="flex-1">{children}</main>
      <ShopFooter settings={settings} />
    </div>
  );
}
