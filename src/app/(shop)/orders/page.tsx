import Link from 'next/link';
import { readGuestId } from '@/lib/guest';
import { listOrdersByGuest } from '@/lib/db/orders';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/orders/labels';
import { ProductImage } from '@/components/product-image';
import { OrderLookupForm } from '@/components/shop/order-lookup-form';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';

export const metadata = { title: 'คำสั่งซื้อของฉัน' };

/**
 * ประวัติสั่งซื้อของเบราว์เซอร์นี้ (guest id) — ไม่ต้อง login
 * ออเดอร์จากเครื่องอื่นดึงมาได้ด้วยฟอร์มด้านล่าง (เลขที่ + เบอร์โทร)
 */
export default async function MyOrdersPage() {
  const guestId = await readGuestId();
  const orders = guestId ? await listOrdersByGuest(guestId) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">คำสั่งซื้อของฉัน</h1>
      <p className="mt-1 text-sm text-muted">ระบบจำเครื่องนี้ไว้ให้โดยไม่ต้องสมัครสมาชิก — คำสั่งซื้อที่ทำจากเครื่องนี้จะแสดงที่นี่</p>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
          <span className="text-4xl" aria-hidden>
            📦
          </span>
          <p className="mt-3 font-semibold">ยังไม่มีคำสั่งซื้อในเครื่องนี้</p>
          <p className="mt-1 text-sm text-muted">เคยสั่งจากเครื่องอื่น? ค้นหาด้วยเลขที่คำสั่งซื้อและเบอร์โทรด้านล่าง</p>
          <Link href="/products" className={`${buttonStyles()} mt-5`}>
            เลือกซื้อสินค้า
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.orderNo}`} className="block rounded-card bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{o.orderNo}</span>
                  <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {o.lines.slice(0, 4).map((l, i) => (
                      <ProductImage key={i} src={l.image} alt="" className="size-10 rounded-md ring-2 ring-surface" />
                    ))}
                  </div>
                  <span className="text-sm text-muted">
                    {o.lines.reduce((s, l) => s + l.qty, 0)} ชิ้น{o.lines.length > 4 && ` · ${o.lines.length} รายการ`}
                  </span>
                  <span className="ml-auto font-bold">{formatBaht(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-card bg-surface p-5 ring-1 ring-line">
        <h2 className="font-semibold">ค้นหาคำสั่งซื้อจากเครื่องอื่น</h2>
        <p className="mt-1 mb-4 text-sm text-muted">กรอกเลขที่คำสั่งซื้อและเบอร์โทรที่ใช้สั่ง — ระบบจะจำไว้ในเครื่องนี้ให้ด้วย</p>
        <OrderLookupForm />
      </section>
    </div>
  );
}
