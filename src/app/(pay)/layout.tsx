import { ShopHeader } from '@/components/shop/header';
import { loadShopHeaderProps } from '@/components/shop/header-data';

/**
 * เปลือกหน้าชำระเงิน — ใช้ header ของร้านให้กลมกลืนกับแอป (พี่ต่อสั่ง 2026-09-15: ไม่ต้องโชว์ว่าเป็น Beam
 * เพราะของจริงหลังบ้านจะเชื่อม API Beam เอง ไม่ใช้ hosted checkout) · ไม่มี footer/แถบเมนูล่าง ให้โฟกัสที่การจ่าย
 */
export default async function PayLayout({ children }: LayoutProps<'/'>) {
  const { headerProps } = await loadShopHeaderProps();
  return (
    <div className="flex min-h-dvh flex-col">
      <ShopHeader {...headerProps} />
      <main className="flex-1">{children}</main>
      <p className="py-4 text-center text-xs text-muted md:py-6">ระบบสาธิต — ไม่มีการตัดเงินจริง</p>
    </div>
  );
}
