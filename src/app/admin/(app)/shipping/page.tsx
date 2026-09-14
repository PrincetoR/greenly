import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { roleCan } from '@/lib/auth/roles';
import { listOrders } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { syncTrackingMock, updateShippingSettings } from '@/lib/actions/orders';
import { formatBaht } from '@/lib/money';
import { formatDateTime, timeAgo } from '@/lib/datetime';
import { CARRIERS, carrierById } from '@/lib/shipping/carriers';
import { guessProvince, isMockDelivered, MOCK_DELIVERED_H } from '@/lib/shipping/tracking';
import type { Order, OrderStatus } from '@/lib/types';
import { PageHeader } from '@/components/admin/page-header';
import { OrderActions } from '@/components/admin/order-actions';
import { RowCheckbox, ShippingQueue } from '@/components/admin/shipping-queue';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { Table, Td, Th } from '@/components/ui/table';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { ExternalLink, Printer, RefreshCw } from 'lucide-react';

export const metadata = { title: 'จัดส่ง' };

const TABS: { key: string; status: OrderStatus | null; label: string; hint: string }[] = [
  { key: 'paid', status: 'paid', label: 'รอแพ็ค', hint: 'ชำระแล้ว/ยืนยันแล้ว รอหยิบสินค้า' },
  { key: 'packing', status: 'packing', label: 'กำลังแพ็ค', hint: 'พิมพ์ใบปะหน้า ใส่เลขพัสดุเมื่อส่งมอบขนส่ง' },
  { key: 'shipped', status: 'shipped', label: 'ระหว่างจัดส่ง', hint: 'รอขนส่งนำส่ง — ซิงก์สถานะหรือกดถึงมือลูกค้าเอง' },
  { key: 'returned', status: 'returned', label: 'ตีกลับ', hint: 'ส่งใหม่ หรือยกเลิกและคืนเงิน' },
  { key: 'settings', status: null, label: 'ตั้งค่า', hint: 'ผู้ส่งบนใบปะหน้า · ขนส่งที่ใช้' },
];

/**
 * หน้าจัดส่ง = มุมมองคลังสินค้า: คิวงานตามขั้น (รอแพ็ค → กำลังแพ็ค → ระหว่างส่ง → ตีกลับ)
 * ต่างจาก "คำสั่งซื้อ" ที่เป็นมุมมองบริการลูกค้า/การเงิน — ใช้ข้อมูล orders ชุดเดียวกัน
 */
export default async function ShippingPage({ searchParams }: PageProps<'/admin/shipping'>) {
  const session = await requirePermission('order.manage');
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const [orders, settings] = await Promise.all([listOrders(), getSettings()]);
  const count = (s: OrderStatus) => orders.filter((o) => o.status === s).length;
  const rows = tab.status ? orders.filter((o) => o.status === tab.status).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
  const now = new Date();
  const deliverable = orders.filter((o) => isMockDelivered(o, now)).length;
  const canSettings = roleCan(session.role, 'settings.manage');
  const back = `/admin/shipping?tab=${tab.key}`;

  return (
    <div>
      <PageHeader
        title="จัดส่ง"
        description={`รอแพ็ค ${count('paid')} · กำลังแพ็ค ${count('packing')} · ระหว่างส่ง ${count('shipped')} · ตีกลับ ${count('returned')}`}
        action={
          <form action={syncTrackingMock}>
            <Button type="submit" variant="secondary" title={`ออเดอร์ที่ส่งเกิน ${MOCK_DELIVERED_H} ชม. จะถูกปิดเป็นถึงมือลูกค้า (จำลอง)`}>
              <RefreshCw className="size-4" aria-hidden />
              ซิงก์สถานะพัสดุ{deliverable > 0 && ` (${deliverable})`}
            </Button>
          </form>
        }
      />
      {sp.updated && <Alert tone="ok" className="mb-4">อัปเดตแล้ว</Alert>}
      {sp.bulk && <Alert tone="ok" className="mb-4">เริ่มแพ็ค {sp.bulk} ใบ</Alert>}
      {sp.synced !== undefined && <Alert tone={Number(sp.synced) > 0 ? 'ok' : 'info'} className="mb-4">ซิงก์จากขนส่ง (จำลอง): ปิดเป็นถึงมือลูกค้า {sp.synced} ใบ</Alert>}
      {sp.saved && <Alert tone="ok" className="mb-4">บันทึกการตั้งค่าจัดส่งแล้ว</Alert>}
      {sp.error === 'tracking' && <Alert tone="danger" className="mb-4">กรุณาเลือกขนส่งและกรอกเลขพัสดุ (ตัวอักษร/ตัวเลข 6–30 ตัว)</Alert>}
      {sp.error === 'transition' && <Alert tone="danger" className="mb-4">เปลี่ยนสถานะนี้ไม่ได้จากสถานะปัจจุบัน</Alert>}

      <nav aria-label="ขั้นตอนจัดส่ง" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/shipping?tab=${t.key}`} aria-current={t.key === tab.key ? 'page' : undefined} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', t.key === tab.key ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:bg-surface-alt')}>
            {t.label}
            {t.status && ` (${count(t.status)})`}
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-sm text-muted">{tab.hint}</p>

      {tab.status ? (
        rows.length === 0 ? (
          <Card>
            <p className="p-8 text-center text-sm text-muted">ไม่มีออเดอร์ในขั้นนี้</p>
          </Card>
        ) : (
          <ShippingQueue ids={rows.map((o) => o.id)} canPack={tab.status === 'paid'}>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th className="w-8" />
                    <Th>เลขที่ / รอมาแล้ว</Th>
                    <Th>ลูกค้า / ปลายทาง</Th>
                    <Th className="text-right">ยอด</Th>
                    {(tab.status === 'shipped' || tab.status === 'returned') && <Th>พัสดุ</Th>}
                    <Th>ดำเนินการ</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <Row key={o.id} order={o} tab={tab.status!} now={now} settings={settings} back={back} />
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="flex flex-col gap-3 md:hidden">
              {rows.map((o) => (
                <li key={o.id} className="rounded-card bg-surface p-4 border border-line">
                  <div className="flex items-center gap-2">
                    <RowCheckbox id={o.id} />
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:text-brand">
                      {o.orderNo}
                    </Link>
                    {o.paymentMethod === 'cod' && <Badge tone="warn">COD {formatBaht(o.total)}</Badge>}
                  </div>
                  <p className="mt-1 text-sm">
                    {o.customer.name} · {guessProvince(o.customer.address) || 'ไม่ระบุจังหวัด'}
                  </p>
                  <p className="text-xs text-muted">{o.lines.reduce((s, l) => s + l.qty, 0)} ชิ้น · {formatBaht(o.total)}</p>
                  <div className="mt-3">
                    <OrderActions order={o} shipping={settings.shipping} back={back} compact />
                  </div>
                </li>
              ))}
            </ul>
          </ShippingQueue>
        )
      ) : (
        <ShippingSettingsForm settings={settings.shipping} canEdit={canSettings} />
      )}
    </div>
  );
}

function Row({ order: o, tab, now, settings, back }: { order: Order; tab: OrderStatus; now: Date; settings: Awaited<ReturnType<typeof getSettings>>; back: string }) {
  const waited = timeAgo(o.updatedAt, now);
  return (
    <tr className="hover:bg-surface-alt/50">
      <Td>
        <RowCheckbox id={o.id} />
      </Td>
      <Td className="whitespace-nowrap">
        <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:text-brand">
          {o.orderNo}
        </Link>
        <span className="block text-xs text-muted">
          {formatDateTime(o.createdAt)} · {waited}
        </span>
        <span className="block text-xs text-muted" title={o.lines.map((l) => `${l.name} × ${l.qty}`).join(', ')}>
          {o.lines.reduce((s, l) => s + l.qty, 0)} ชิ้น · {o.lines.length} รายการ
        </span>
      </Td>
      <Td>
        {o.customer.name}
        <span className="block text-xs text-muted whitespace-nowrap">
          {o.customer.phone} · {guessProvince(o.customer.address) || 'ไม่ระบุจังหวัด'}
        </span>
      </Td>
      <Td className="text-right font-medium whitespace-nowrap">
        {formatBaht(o.total)}
        {o.paymentMethod === 'cod' && (
          <Badge tone="warn" className="mt-1">
            COD
          </Badge>
        )}
      </Td>
      {o.shipment && (tab === 'shipped' || tab === 'returned') && (
        <Td className="text-muted">
          <span className="block whitespace-nowrap">{carrierById(o.shipment.carrier).short}</span>
          <a href={carrierById(o.shipment.carrier).trackUrl(o.shipment.trackingNo)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap hover:text-brand">
            {o.shipment.trackingNo}
            <ExternalLink className="size-3" aria-hidden />
          </a>
          {tab === 'returned' && <span className="block text-xs text-danger">{o.shipment.returnReason}</span>}
          {tab === 'shipped' && isMockDelivered(o, now) && <Badge tone="ok" className="mt-1">น่าจะถึงแล้ว</Badge>}
        </Td>
      )}
      <Td>
        <div className="flex flex-wrap items-center gap-2">
          {(tab === 'paid' || tab === 'packing') && (
            <a href={`/admin/shipping/labels?ids=${o.id}`} target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'ghost', size: 'sm' })} title="พิมพ์ใบปะหน้า">
              <Printer className="size-4" aria-hidden />
            </a>
          )}
          <OrderActions order={o} shipping={settings.shipping} back={back} compact />
        </div>
      </Td>
    </tr>
  );
}

function ShippingSettingsForm({ settings, canEdit }: { settings: Awaited<ReturnType<typeof getSettings>>['shipping']; canEdit: boolean }) {
  return (
    <Card>
      <CardHeader title="ตั้งค่าการจัดส่ง" description="ข้อมูลผู้ส่งจะพิมพ์บนใบปะหน้า · เลือกขนส่งที่ร้านใช้ (แสดงในตัวเลือกตอนกดจัดส่ง)" />
      <form action={updateShippingSettings} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="ชื่อผู้ส่ง (ร้าน)" htmlFor="senderName" required>
          <input id="senderName" name="senderName" defaultValue={settings.senderName} required disabled={!canEdit} />
        </Field>
        <Field label="เบอร์โทรผู้ส่ง" htmlFor="senderPhone">
          <input id="senderPhone" name="senderPhone" defaultValue={settings.senderPhone} disabled={!canEdit} />
        </Field>
        <Field label="ที่อยู่ผู้ส่ง" htmlFor="senderAddress" className="sm:col-span-2">
          <textarea id="senderAddress" name="senderAddress" defaultValue={settings.senderAddress} rows={2} disabled={!canEdit} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">ขนส่งที่ใช้</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CARRIERS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm border border-line">
                <input type="checkbox" name="carriers" value={c.id} defaultChecked={settings.carriers.includes(c.id)} disabled={!canEdit} className="accent-brand" />
                <span>
                  {c.name}
                  <span className="block text-xs text-muted">ประมาณ {c.etaDays[0]}–{c.etaDays[1]} วัน</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="ขนส่งเริ่มต้น" htmlFor="defaultCarrier">
          <Select id="defaultCarrier" name="defaultCarrier" defaultValue={settings.defaultCarrier} disabled={!canEdit} options={CARRIERS.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <div className="flex items-end sm:col-span-2">
          {canEdit ? <Button type="submit">บันทึกการตั้งค่าจัดส่ง</Button> : <p className="text-sm text-muted">เฉพาะ admin แก้ไขได้</p>}
        </div>
      </form>
    </Card>
  );
}
