import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { roleCan } from '@/lib/auth/roles';
import { listOrders } from '@/lib/db/orders';
import { listProducts } from '@/lib/db/products';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus } from '@/lib/pricing/status';
import { formatBaht } from '@/lib/money';
import { humanCountdown } from '@/lib/datetime';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/orders/labels';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const metadata = { title: 'แดชบอร์ด' };

export default async function AdminDashboard() {
  const session = await requireSession();
  const [orders, products, ctx] = await Promise.all([listOrders(), listProducts(), loadPromotionContext()]);
  const { settings, promotions, usage, now } = ctx;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const active = orders.filter((o) => o.status !== 'cancelled');
  const today = active.filter((o) => new Date(o.createdAt) >= startOfToday);
  const revenueToday = today.reduce((s, o) => s + o.total, 0);
  const revenueAll = active.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === 'pending');
  const lowStock = products.filter((p) => p.active && p.stock <= settings.lowStockThreshold).sort((a, b) => a.stock - b.stock);
  const live = promotions.filter((p) => promotionStatus(p, now, usage[p.id]) === 'live');
  const canOrders = roleCan(session.role, 'order.manage');
  const canPromo = roleCan(session.role, 'promotion.manage');

  return (
    <div>
      {/* ไม่มีหัวข้อ/บรรทัดทักทาย (พี่ต่อเอาออก) — แถว KPI เริ่มที่ขอบบนเดียวกับ card "จัดการสินค้า" · ชื่อหน้าอยู่ใน metadata.title */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="ยอดขายวันนี้" value={formatBaht(revenueToday)} sub={`${today.length} ออเดอร์`} />
        <Kpi label="รอยืนยัน/ชำระ" value={String(pending.length)} sub="ออเดอร์" href={canOrders ? '/admin/orders?status=pending' : undefined} tone={pending.length > 0 ? 'warn' : undefined} />
        <Kpi label="สินค้าใกล้หมด" value={String(lowStock.length)} sub={`≤ ${settings.lowStockThreshold} ชิ้น`} href="/admin/products?status=low" tone={lowStock.length > 0 ? 'danger' : undefined} />
        <Kpi label="โปรที่กำลังใช้งาน" value={String(live.length)} sub="โปรโมชัน" href={canPromo ? '/admin/promotions?status=live' : '/promotions'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {canOrders && (
          <Card>
            <CardHeader
              title="ออเดอร์ล่าสุด"
              description={`ยอดขายสะสม ${formatBaht(revenueAll)}`}
              action={
                <Link href="/admin/orders" className="text-sm font-medium text-brand hover:underline">
                  ดูทั้งหมด
                </Link>
              }
            />
            {orders.length === 0 ? (
              <p className="p-5 text-sm text-muted">ยังไม่มีคำสั่งซื้อ</p>
            ) : (
              <ul className="divide-y divide-line">
                {orders.slice(0, 6).map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface-alt/60">
                      <span className="font-mono font-medium">{o.orderNo}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{o.customer.name}</span>
                      <span className="font-medium">{formatBaht(o.total)}</span>
                      <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card>
          <CardHeader
            title="โปรโมชันที่กำลังใช้งาน"
            action={
              canPromo ? (
                <Link href="/admin/promotions/new" className={buttonStyles({ size: 'sm' })}>
                  <Plus className="size-4" aria-hidden />
                  สร้างโปร
                </Link>
              ) : undefined
            }
          />
          {live.length === 0 ? (
            <p className="p-5 text-sm text-muted">ตอนนี้ไม่มีโปรที่กำลังใช้งาน</p>
          ) : (
            <ul className="divide-y divide-line">
              {live.map((p) => {
                const u = usage[p.id];
                return (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      {canPromo ? (
                        <Link href={`/admin/promotions/${p.id}`} className="block truncate font-medium hover:text-brand">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="block truncate font-medium">{p.name}</span>
                      )}
                      <span className="text-xs text-muted">
                        เหลือ {humanCountdown(p.endsAt, now)} · ใช้ไป {u?.totalUses ?? 0}
                        {p.limits.totalUses !== null && `/${p.limits.totalUses}`} สิทธิ์
                      </span>
                    </span>
                    {p.coupon && <Badge tone="accent" className="font-mono">{p.coupon.code}</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="สินค้าใกล้หมด"
            description={`stock ≤ ${settings.lowStockThreshold} ชิ้น`}
            action={
              <Link href="/admin/products?status=low" className="text-sm font-medium text-brand hover:underline">
                ดูทั้งหมด
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-muted">สต็อกทุกรายการยังเพียงพอ</p>
          ) : (
            <ul className="grid gap-x-6 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate hover:text-brand">
                    {p.name}
                  </Link>
                  <span className={`shrink-0 font-semibold ${p.stock === 0 ? 'text-danger' : 'text-warn'}`}>{p.stock === 0 ? 'หมด' : `เหลือ ${p.stock}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, href, tone }: { label: string; value: string; sub?: string; href?: string; tone?: 'warn' | 'danger' }) {
  const body = (
    <>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'warn' ? 'text-warn' : tone === 'danger' ? 'text-danger' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = 'block rounded-card bg-surface p-4 border border-line';
  return href ? (
    <Link href={href} className={`${cls} transition-shadow hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
