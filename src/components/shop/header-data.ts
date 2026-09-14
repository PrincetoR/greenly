import 'server-only';
import { cartCount, readCart } from '@/lib/cart/storage';
import { getSettings } from '@/lib/db/settings';
import { readMyWishlist } from '@/lib/wishlist/storage';
import { getSession } from '@/lib/auth/session';
import { isStaffRole } from '@/lib/auth/roles';

/**
 * ข้อมูลที่ header หน้าร้านต้องใช้ — โหลดที่เดียว ใช้ทั้งเปลือกหน้าร้านและหลังบ้าน
 * (หลังบ้านใช้ header เดียวกับหน้าร้าน ให้เมนู "การจัดการ" ต่อเนื่องกับหน้าสินค้าทั้งหมด)
 */
export async function loadShopHeaderProps() {
  const [settings, cart, wishlist, session] = await Promise.all([
    getSettings(),
    readCart(),
    readMyWishlist(),
    getSession(),
  ]);
  return {
    settings,
    session,
    headerProps: {
      storeName: settings.storeName,
      tagline: settings.tagline,
      cartCount: cartCount(cart),
      wishlistCount: wishlist.length,
      // ลูกค้าที่ login จากโปรไฟล์ไม่ใช่พนักงาน — ไม่เห็นเมนูการจัดการ
      isStaff: isStaffRole(session?.role),
      userName: session?.user.username ?? null,
    },
  };
}
