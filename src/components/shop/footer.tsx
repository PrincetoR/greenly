import Link from 'next/link';
import { Leaf } from 'lucide-react';
import type { Settings } from '@/lib/types';

export function ShopFooter({ settings }: { settings: Settings }) {
  const { storeName, tagline, contact } = settings;
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        {/* คอลัมน์แรก: แบรนด์ + ลิขสิทธิ์อยู่ด้วยกัน ไม่แยกเป็นแถบล่าง */}
        <div className="flex flex-col">
          <p className="flex items-center gap-1.5 text-lg font-bold text-brand">
            <Leaf className="size-5" aria-hidden />
            {storeName}
          </p>
          <p className="mt-1 text-sm text-muted">{tagline}</p>
          <p className="mt-auto pt-6 text-xs text-muted">
            © {new Date().getFullYear()} {storeName} ·{' '}
            <Link href="/admin" className="hover:text-ink">
              ระบบหลังบ้าน
            </Link>
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">เมนู</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li><Link href="/products" className="hover:text-ink">สินค้าทั้งหมด</Link></li>
            <li><Link href="/promotions" className="hover:text-ink">โปรโมชัน</Link></li>
            <li><Link href="/cart" className="hover:text-ink">ตะกร้าสินค้า</Link></li>
            <li><Link href="/account" className="hover:text-ink">โปรไฟล์</Link></li>
            <li><Link href="/wishlist" className="hover:text-ink">รายการโปรด</Link></li>
            <li><Link href="/orders" className="hover:text-ink">ประวัติการสั่งซื้อ</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">ติดต่อเรา</p>
          <ul className="mt-2 space-y-1 text-muted">
            {contact.phone && <li>โทร {contact.phone}</li>}
            {contact.email && <li>{contact.email}</li>}
            {contact.line && <li>LINE {contact.line}</li>}
          </ul>
        </div>
      </div>
    </footer>
  );
}
