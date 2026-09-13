import Link from 'next/link';
import { Heart, Package, ShoppingCart, User } from 'lucide-react';
import { readGuestId } from '@/lib/guest';
import { listOrdersByGuest } from '@/lib/db/orders';
import { readMyWishlist } from '@/lib/wishlist/storage';
import { readCart, cartCount } from '@/lib/cart/storage';
import { formatBaht } from '@/lib/money';
import { formatDate } from '@/lib/datetime';
import { Card, CardHeader } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'โปรไฟล์' };

/**
 * หน้าโปรไฟล์ของลูกค้าแบบไม่ต้อง login — สรุปสิ่งที่ระบบจำไว้ให้เครื่องนี้
 * ข้อมูลผู้รับดึงจากออเดอร์ล่าสุด (ไม่มีฟอร์มแก้ เพราะยังไม่มีบัญชีจริง)
 */
export default async function AccountPage() {
  const guestId = await readGuestId();
  const [orders, wishlist, cart] = await Promise.all([guestId ? listOrdersByGuest(guestId) : [], readMyWishlist(), readCart()]);
  const latest = orders[0];
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
          <User className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{latest ? latest.customer.name : 'ลูกค้าทั่วไป'}</h1>
          <p className="text-sm text-muted">{latest ? latest.customer.phone : 'ยังไม่เคยสั่งซื้อจากเครื่องนี้'} · ระบบจำเครื่องนี้ไว้ให้โดยไม่ต้องสมัครสมาชิก</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat href="/orders" Icon={Package} label="ประวัติการสั่งซื้อ" value={`${orders.length} รายการ`} sub={spent > 0 ? `ยอดรวม ${formatBaht(spent)}` : undefined} />
        <Stat href="/wishlist" Icon={Heart} label="รายการโปรด" value={`${wishlist.length} รายการ`} />
        <Stat href="/cart" Icon={ShoppingCart} label="ตะกร้า" value={`${cartCount(cart)} ชิ้น`} />
      </div>

      {latest && (
        <Card className="mt-6">
          <CardHeader title="ข้อมูลผู้รับล่าสุด" description={`จากคำสั่งซื้อ ${latest.orderNo} · ${formatDate(latest.createdAt)}`} />
          <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">ชื่อ-นามสกุล</dt>
              <dd className="font-medium">{latest.customer.name}</dd>
            </div>
            <div>
              <dt className="text-muted">เบอร์โทร</dt>
              <dd className="font-medium">{latest.customer.phone}</dd>
            </div>
            {latest.customer.email && (
              <div>
                <dt className="text-muted">อีเมล</dt>
                <dd className="font-medium">{latest.customer.email}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-muted">ที่อยู่จัดส่ง</dt>
              <dd className="font-medium whitespace-pre-line">{latest.customer.address}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="เปลี่ยนเครื่อง?" description="ประวัติผูกกับเบราว์เซอร์นี้ — เครื่องอื่นดึงออเดอร์ได้ด้วยเลขที่คำสั่งซื้อและเบอร์โทร" />
        <div className="p-5">
          <Link href="/orders" className={buttonStyles({ variant: 'secondary' })}>
            ค้นหาคำสั่งซื้อจากเครื่องอื่น
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Stat({ href, Icon, label, value, sub }: { href: string; Icon: typeof Package; label: string; value: string; sub?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-card bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-md">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-muted" aria-hidden>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="block font-semibold">{value}</span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </Link>
  );
}
