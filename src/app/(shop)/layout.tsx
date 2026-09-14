import { ShopHeader } from '@/components/shop/header';
import { ShopFooter } from '@/components/shop/footer';
import { loadShopHeaderProps } from '@/components/shop/header-data';
import { MobileTabBar } from '@/components/shop/mobile-tabbar';

/** เปลือกฝั่งลูกค้า — ทุกหน้าใต้ (shop) ใช้ header/footer ชุดนี้ */
export default async function ShopLayout({ children }: LayoutProps<'/'>) {
  const { settings, headerProps } = await loadShopHeaderProps();

  return (
    <div className="flex min-h-dvh flex-col">
      <ShopHeader {...headerProps} />
      <main className="flex-1">{children}</main>
      <ShopFooter settings={settings} />
      {/* แถบเมนูล่างมือถือ + spacer (ซ่อนบนหน้าสินค้า) */}
      <MobileTabBar />
    </div>
  );
}
