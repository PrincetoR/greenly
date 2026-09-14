import { requireSession } from '@/lib/auth/session';
import { visibleMenu } from '@/lib/auth/roles';
import { ShopHeader } from '@/components/shop/header';
import { loadShopHeaderProps } from '@/components/shop/header-data';
import { AdminShell } from '@/components/admin/shell';
import { MobileTabBar } from '@/components/shop/mobile-tabbar';

/**
 * ชั้นที่สอง — proxy กันมาแล้วชั้นหนึ่ง แต่ layout ต้องตรวจกับ users.json จริงอีกที
 * เปลือกหลังบ้านใช้ header เดียวกับหน้าร้าน (เมนู "การจัดการ" active) · เมนูหลังบ้านอยู่ใน card ซ้ายแบบเดียวกับหมวดหมู่สินค้า
 */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireSession();
  const items = visibleMenu(session.role);
  const { headerProps } = await loadShopHeaderProps();
  return (
    <div className="flex min-h-dvh flex-col">
      <ShopHeader {...headerProps} adminItems={items} />
      <main className="flex-1">
        <AdminShell items={items} session={session}>
          {children}
        </AdminShell>
      </main>
      {/* แถบเมนูล่างมือถือตัวเดียวกับหน้าร้าน — อยู่หลังบ้านช่องขวาสุด "การจัดการ" active (พี่ต่อถามว่าทำไมไม่แสดง 2026-09-15) */}
      <MobileTabBar staff />
    </div>
  );
}
