'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, Search, ShoppingBag, Tag, User } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tab = { href: string; label: string; icon: typeof Home; active: (p: string) => boolean };

const TABS: Tab[] = [
  { href: '/', label: 'หน้าแรก', icon: Home, active: (p) => p === '/' },
  // ถุงช้อปปิ้ง — พี่ต่อขอไอคอนที่ดูเป็นสินค้า/น่ากด (เดิมเป็นกล่องพัสดุ)
  { href: '/products', label: 'สินค้าทั้งหมด', icon: ShoppingBag, active: (p) => p.startsWith('/products') || p.startsWith('/category/') || p.startsWith('/product/') },
  { href: '/promotions', label: 'โปรโมชัน', icon: Tag, active: (p) => p.startsWith('/promotions') },
];
const PROFILE_TAB: Tab = { href: '/account', label: 'โปรไฟล์', icon: User, active: (p) => p.startsWith('/account') || p.startsWith('/orders') || p.startsWith('/order/') || p.startsWith('/wishlist') };
/** login หลังบ้าน (staff/admin) → ช่องขวาสุดเป็นทางเข้า "การจัดการ" แทนโปรไฟล์ (พี่ต่อสั่ง) */
const ADMIN_TAB: Tab = { href: '/admin', label: 'การจัดการ', icon: LayoutDashboard, active: (p) => p.startsWith('/admin') };

/**
 * แถบเมนูล่างบนมือถือ (พี่ต่อสั่ง 2026-09-15): หน้าแรก · สินค้าทั้งหมด · [ค้นหา] · โปรโมชัน · โปรไฟล์ — ไอคอนล้วนไม่มีชื่อ · แสดงทั้งหน้าร้านและหลังบ้าน (layout ทั้งสอง render)
 * ปุ่มค้นหาตรงกลาง = วงกลม 64 ลอยเหนือแถบ โผล่พ้นเส้น 40% (26px — พี่ต่อขยับจาก 30%) · พื้นแถบเจาะรูรอบวงกลมเว้นช่อง 6px (mask ใน globals `.tabbar-bg`)
 *   ให้ดูเหมือนวงกลมลอยไม่ติดกับแถบ (พี่ต่อสั่ง 2026-09-15) · กดแล้วไป /search (ช่องค้นหาทั้งเว็บ) · อยู่ /search แล้วโฟกัสช่องเลย
 * หน้า /search ซ่อนแถบนี้ (มีแค่ header + ช่องค้นหา — พี่ต่อสั่ง)
 * ช่องขวาสุด: guest = โปรไฟล์ · login หลังบ้าน (staff/admin) = การจัดการ (/admin)
 * หน้าสินค้าไม่แสดง — มีแถบ [ใส่ตะกร้า · หัวใจ] ติดล่างแทน (แบบ Shopee/Lazada) ไม่งั้นวงกลมค้นหาทับปุ่ม
 * ตัวเว้นที่ (spacer) สูงเท่าแถบอยู่ท้าย layout ให้ footer ไม่ถูกทับ
 */
export function MobileTabBar({ staff = false }: { staff?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname.startsWith('/product/') || pathname === '/search') return null;

  const search = () => router.push('/search');

  const item = (t: Tab) => {
    const on = t.active(pathname);
    return (
      <Link key={t.href} href={t.href} aria-label={t.label} aria-current={on ? 'page' : undefined} className={cn('flex h-14 items-center justify-center', on ? 'text-brand' : 'text-muted')}>
        <t.icon className="size-6" aria-hidden />
      </Link>
    );
  };

  return (
    <>
      <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden />
      <nav aria-label="เมนูมือถือ" className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
        {/* พื้นแถบ + เส้นบน แยกเป็นชั้นเพื่อเจาะรู (mask) รอบวงกลมค้นหา — ตัวแถบเองโปร่ง */}
        <div className="tabbar-bg absolute inset-0 border-t border-line bg-surface" aria-hidden />
        <div className="relative grid grid-cols-5">
          {TABS.slice(0, 2).map(item)}
          <div className="relative">
            <button
              type="button"
              onClick={search}
              aria-label="ค้นหา"
              className="absolute -top-[26px] left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-colors hover:bg-brand-hover active:scale-95"
            >
              <Search className="size-7" aria-hidden />
            </button>
          </div>
          {[TABS[2], staff ? ADMIN_TAB : PROFILE_TAB].map(item)}
        </div>
      </nav>
    </>
  );
}
