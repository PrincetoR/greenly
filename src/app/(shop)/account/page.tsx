import Link from 'next/link';
import { Heart, LayoutDashboard, LogOut, Package, ShoppingCart } from 'lucide-react';
import { readGuestId } from '@/lib/guest';
import { getSession } from '@/lib/auth/session';
import { ROLE_LABEL, isStaffRole } from '@/lib/auth/roles';
import { logout } from '@/lib/actions/auth';
import { AccountPanel } from '@/components/shop/account-panel';
import { listOrdersByGuest } from '@/lib/db/orders';
import { readMyWishlist } from '@/lib/wishlist/storage';
import { readCart, cartCount } from '@/lib/cart/storage';
import { formatBaht } from '@/lib/money';
import { formatDate } from '@/lib/datetime';
import { Card, CardHeader } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'โปรไฟล์' };

/**
 * หน้าโปรไฟล์ — guest: สรุปสิ่งที่ระบบจำไว้ให้เครื่องนี้ + ปุ่มเข้าสู่ระบบ (เลื่อนไปฟอร์ม login ในหน้าเดียวกัน)
 * login เป็นลูกค้า: ชื่อบัญชี + ปุ่มออกจากระบบล่างสุด · พนักงาน: ลิงก์ไปการจัดการ (ออกจากระบบอยู่ใน hamburger เหมือนเดิม — พี่ต่อสั่ง)
 * ตะกร้า/รายการโปรด/ออเดอร์ยังผูกกับ guest id ของเครื่อง (บัญชีลูกค้ายังไม่รวมประวัติข้ามเครื่อง)
 */
export default async function AccountPage() {
  const [guestId, session] = await Promise.all([readGuestId(), getSession()]);
  const [orders, wishlist, cart] = await Promise.all([guestId ? listOrdersByGuest(guestId) : [], readMyWishlist(), readCart()]);
  const latest = orders[0];
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const staff = isStaffRole(session?.role);
  const name = session ? session.user.name : latest ? latest.customer.name : 'ลูกค้าทั่วไป';
  const sub = session
    ? `${ROLE_LABEL[session.role]} · ${session.user.username}`
    : `${latest ? latest.customer.phone : 'ยังไม่เคยสั่งซื้อจากเครื่องนี้'} · ระบบจำเครื่องนี้ไว้ให้โดยไม่ต้องสมัครสมาชิก`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <AccountPanel name={name} sub={sub} guest={!session}>
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

      {staff && (
        <Link href="/admin" className={buttonStyles({ variant: 'secondary', className: 'mt-6 w-full' })}>
          <LayoutDashboard className="size-4" aria-hidden />
          ไปหน้าการจัดการ
        </Link>
      )}
      {/* ลูกค้า: ออกจากระบบล่างสุดของโปรไฟล์ (พนักงานใช้ hamburger) */}
      {session && !staff && (
        <form action={logout} className="mt-6">
          <Button type="submit" variant="secondary" className="w-full text-danger">
            <LogOut className="size-4" aria-hidden />
            ออกจากระบบ
          </Button>
        </form>
      )}
      </AccountPanel>
    </div>
  );
}

function Stat({ href, Icon, label, value, sub }: { href: string; Icon: typeof Package; label: string; value: string; sub?: string }) {
  return (
    <Link href={href} className="group card-hover flex items-center gap-3 rounded-card bg-surface p-4 border border-line">
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
