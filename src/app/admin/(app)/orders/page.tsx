import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listOrders } from '@/lib/db/orders';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_CHANNEL_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '@/lib/orders/labels';
import { carrierById } from '@/lib/shipping/carriers';
import type { OrderStatus } from '@/lib/types';
import { PageHeader } from '@/components/admin/page-header';
import { Table, Td, Th } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { Receipt } from 'lucide-react';

export const metadata = { title: 'คำสั่งซื้อ' };

const STATUSES: OrderStatus[] = ['pending', 'paid', 'packing', 'shipped', 'done', 'returned', 'cancelled'];
const PAGE_SIZE = 50;

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requirePermission('order.manage');
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const all = await listOrders();
  const matched = all.filter(
    (o) => (!status || o.status === status) && (!q || `${o.orderNo} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q)),
  );
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;
  // แบ่งหน้า 50 รายการ — ประวัติสาธิตมีหลายร้อยออเดอร์ ไม่งั้นหน้ายาวเกิน
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(String(sp.page ?? '1'), 10) || 1));
  const orders = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (q) p.set('q', q);
    if (n > 1) p.set('page', String(n));
    const qs = p.toString();
    return `/admin/orders${qs ? `?${qs}` : ''}`;
  };

  return (
    <div>
      <PageHeader title="คำสั่งซื้อ" description={`ทั้งหมด ${all.length.toLocaleString('th-TH')} รายการ · รอชำระ/ยืนยัน ${count('pending')} · รอแพ็ค ${count('paid')} · กำลังแพ็ค ${count('packing')} · ระหว่างส่ง ${count('shipped')}`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip href="/admin/orders" active={!status}>
          ทั้งหมด
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s} href={`/admin/orders?status=${s}`} active={status === s}>
            {ORDER_STATUS_LABEL[s]} ({count(s)})
          </Chip>
        ))}
        <form className="ml-auto flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input type="search" name="q" defaultValue={q} placeholder="เลขที่ / ชื่อ / เบอร์" aria-label="ค้นหาคำสั่งซื้อ" className="w-56!" />
        </form>
      </div>

      {matched.length === 0 ? (
        <EmptyState icon={<Receipt />} title="ไม่มีคำสั่งซื้อ" description={q || status ? 'ลองเปลี่ยนตัวกรอง' : 'เมื่อลูกค้าสั่งซื้อ รายการจะขึ้นที่นี่'} />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>เลขที่</Th>
                  <Th>วันที่</Th>
                  <Th>ลูกค้า</Th>
                  <Th>ชำระ</Th>
                  <Th>จัดส่ง</Th>
                  <Th className="text-right">ยอด</Th>
                  <Th>สถานะ</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-alt/50">
                    <Td>
                      <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:text-brand">
                        {o.orderNo}
                      </Link>
                    </Td>
                    <Td className="text-muted">{formatDateTime(o.createdAt)}</Td>
                    <Td>
                      {o.customer.name}
                      <span className="block text-xs text-muted">{o.customer.phone}</span>
                    </Td>
                    <Td className="text-muted">
                      <span className="block whitespace-nowrap">{o.paymentMethod === 'cod' ? PAYMENT_LABEL.cod : o.payment?.channel ? PAYMENT_CHANNEL_LABEL[o.payment.channel] : 'Beam'}</span>
                      {o.payment && <Badge tone={PAYMENT_STATUS_TONE[o.payment.status]}>{PAYMENT_STATUS_LABEL[o.payment.status]}</Badge>}
                    </Td>
                    <Td className="text-muted">
                      {o.shipment ? (
                        <>
                          <span className="block whitespace-nowrap">{carrierById(o.shipment.carrier).short}</span>
                          <span className="font-mono text-xs">{o.shipment.trackingNo}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-right font-medium">{formatBaht(o.total)}</Td>
                    <Td>
                      <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <ul className="flex flex-col gap-3 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="card-hover block rounded-card bg-surface p-4 border border-line">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium">{o.orderNo}</span>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm">
                    {o.customer.name} · {o.customer.phone}
                  </p>
                  <p className="mt-1 flex justify-between text-xs text-muted">
                    <span>{formatDateTime(o.createdAt)}</span>
                    <span className="text-base font-semibold text-ink">{formatBaht(o.total)}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="แบ่งหน้า" className="mt-4 flex items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, matched.length)} จาก {matched.length.toLocaleString('th-TH')} รายการ
              </p>
              <div className="flex gap-2">
                <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
                  ก่อนหน้า
                </PageLink>
                <span className="px-2 py-1.5 text-muted">
                  หน้า {page} / {pages}
                </span>
                <PageLink href={pageHref(page + 1)} disabled={page >= pages}>
                  ถัดไป
                </PageLink>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = 'rounded-lg px-3 py-1.5 font-medium border border-line';
  return disabled ? (
    <span aria-disabled className={cn(cls, 'text-muted opacity-50')}>
      {children}
    </span>
  ) : (
    <Link href={href} className={cn(cls, 'bg-surface hover:bg-surface-alt')}>
      {children}
    </Link>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors', active ? 'bg-brand text-white ring-brand' : 'bg-surface ring-line hover:bg-surface-alt')}>
      {children}
    </Link>
  );
}
