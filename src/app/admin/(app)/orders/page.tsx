import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listOrders } from '@/lib/db/orders';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_LABEL } from '@/lib/orders/labels';
import type { OrderStatus } from '@/lib/types';
import { PageHeader } from '@/components/admin/page-header';
import { Table, Td, Th } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { Receipt } from 'lucide-react';

export const metadata = { title: 'คำสั่งซื้อ' };

const STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'done', 'cancelled'];

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requirePermission('order.manage');
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const all = await listOrders();
  const orders = all.filter(
    (o) => (!status || o.status === status) && (!q || `${o.orderNo} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q)),
  );
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;

  return (
    <div>
      <PageHeader title="คำสั่งซื้อ" description={`ทั้งหมด ${all.length} รายการ · รอยืนยัน ${count('pending')}`} />

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

      {orders.length === 0 ? (
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
                    <Td className="text-muted">{PAYMENT_LABEL[o.paymentMethod]}</Td>
                    <Td className="text-right font-medium">{formatBaht(o.total)}</Td>
                    <Td>
                      <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="block rounded-card bg-surface p-4 ring-1 ring-line">
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
        </>
      )}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors', active ? 'bg-brand text-white ring-brand' : 'bg-surface ring-line hover:bg-surface-alt')}>
      {children}
    </Link>
  );
}
