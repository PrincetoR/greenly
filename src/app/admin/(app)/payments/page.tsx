import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { listPayments } from '@/lib/db/payments';
import { listOrders } from '@/lib/db/orders';
import { getSettings } from '@/lib/db/settings';
import { updateBeamSettings, testBeamConnection } from '@/lib/actions/settings';
import { refundPaymentAction } from '@/lib/actions/payments';
import { formatBaht } from '@/lib/money';
import { formatDateTime } from '@/lib/datetime';
import { PAYMENT_CHANNEL_LABEL, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from '@/lib/orders/labels';
import { BEAM_CHANNELS, BEAM_FEATURES, BEAM_GROUP_LABEL } from '@/lib/payments/beam';
import type { PaymentStatus } from '@/lib/types';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, Td, Th } from '@/components/ui/table';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/cn';
import { CheckCircle2, Circle } from 'lucide-react';

export const metadata = { title: 'การชำระเงิน' };

const TABS = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'transactions', label: 'รายการ' },
  { key: 'settings', label: 'ตั้งค่า Beam' },
];
const STATUSES: PaymentStatus[] = ['succeeded', 'pending', 'failed', 'expired', 'refunded', 'partially_refunded'];
const PAGE_SIZE = 50;

/**
 * การชำระเงิน = ledger ฝั่ง Beam (mock): ภาพรวมยอด/ค่าธรรมเนียม/ช่องทาง · รายการ + คืนเงิน · ตั้งค่าช่องทาง
 * COD ไม่อยู่ใน ledger (เงินสดเข้าตอนส่งถึง) แต่แสดงรวมในภาพรวมให้เห็นสัดส่วน
 */
export default async function PaymentsPage({ searchParams }: PageProps<'/admin/payments'>) {
  await requirePermission('payment.manage');
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? 'overview';
  const [payments, orders, settings] = await Promise.all([listPayments(), listOrders(), getSettings()]);
  const beam = settings.payments.beam;

  const ok = payments.filter((p) => p.status === 'succeeded' || p.status === 'refunded' || p.status === 'partially_refunded');
  const gross = ok.reduce((s, p) => s + p.amount, 0);
  const fees = ok.reduce((s, p) => s + p.fee, 0);
  const refunded = payments.reduce((s, p) => s + p.refunds.reduce((x, r) => x + r.amount, 0), 0);
  const attempts = payments.filter((p) => p.status !== 'pending').length;
  const successRate = attempts ? (ok.length / attempts) * 100 : 0;
  const codOrders = orders.filter((o) => o.paymentMethod === 'cod' && o.status !== 'cancelled');
  const codCollected = codOrders.filter((o) => o.payment?.status === 'succeeded').reduce((s, o) => s + o.total, 0);
  const codPending = codOrders.filter((o) => o.payment?.status !== 'succeeded').reduce((s, o) => s + o.total, 0);

  // ช่องทาง: จำนวน/ยอด/ค่าธรรมเนียม
  const byChannel = BEAM_CHANNELS.map((c) => {
    const rows = ok.filter((p) => p.channel === c.id);
    return { channel: c, count: rows.length, amount: rows.reduce((s, p) => s + p.amount, 0), fee: rows.reduce((s, p) => s + p.fee, 0) };
  }).sort((a, b) => b.amount - a.amount);
  const maxAmount = Math.max(1, ...byChannel.map((b) => b.amount));

  // รายการ
  const status = STATUSES.includes(sp.status as PaymentStatus) ? (sp.status as PaymentStatus) : undefined;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const matched = payments.filter((p) => (!status || p.status === status) && (!q || `${p.orderNo} ${p.reference ?? ''} ${p.customer.name} ${p.customer.phone}`.toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(String(sp.page ?? '1'), 10) || 1));
  const rows = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const txHref = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ tab: 'transactions' });
    const m = { status, q, page: undefined as string | undefined, ...over };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    return `/admin/payments?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="การชำระเงิน"
        description={`Beam · โหมด ${beam.mode === 'live' ? 'ใช้งานจริง' : 'ทดสอบ (sandbox)'} · ${beam.enabled ? 'เปิดรับชำระ' : 'ปิดอยู่'} · ${BEAM_CHANNELS.filter((c) => beam.channels[c.id] !== false).length} ช่องทาง`}
      />
      {sp.saved && <Alert tone="ok" className="mb-4">บันทึกการตั้งค่า Beam แล้ว</Alert>}
      {sp.refunded && <Alert tone="ok" className="mb-4">คืนเงินแล้ว (จำลอง)</Alert>}
      {sp.test === 'ok' && <Alert tone="ok" className="mb-4">เชื่อมต่อ Beam สำเร็จ (จำลอง) — merchant {beam.merchantId} · latency 142 ms</Alert>}
      {sp.test === 'fail' && <Alert tone="danger" className="mb-4">เชื่อมต่อไม่สำเร็จ — ตรวจ Merchant ID / Public key และเปิดใช้งาน Beam ก่อน</Alert>}
      {typeof sp.error === 'string' && <Alert tone="danger" className="mb-4">{sp.error}</Alert>}

      <nav aria-label="หน้าย่อยการชำระเงิน" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/payments?tab=${t.key}`} aria-current={t.key === tab ? 'page' : undefined} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', t.key === tab ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:bg-surface-alt')}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="รับชำระผ่าน Beam" value={formatBaht(gross)} sub={`${ok.length.toLocaleString('th-TH')} รายการสำเร็จ`} />
            <Kpi label="ค่าธรรมเนียม Beam" value={`-${formatBaht(fees)}`} sub={gross ? `${((fees / gross) * 100).toFixed(2)}% ของยอด` : '—'} tone="accent" />
            <Kpi label="คืนเงินแล้ว" value={formatBaht(refunded)} sub={`${payments.filter((p) => p.refunds.length).length} รายการ`} />
            <Kpi label="อัตราสำเร็จ" value={`${successRate.toFixed(1)}%`} sub={`${attempts.toLocaleString('th-TH')} ครั้งที่ลองจ่าย`} />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader title="สัดส่วนช่องทาง" description="รายการที่สำเร็จ · ค่าธรรมเนียมตามอัตราตัวอย่างของแต่ละช่องทาง" />
              <ol className="flex flex-col gap-4 p-5">
                {byChannel.map((b) => (
                  <li key={b.channel.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {b.channel.name} <span className="text-xs font-normal text-muted">· {BEAM_GROUP_LABEL[b.channel.group]}</span>
                    </p>
                    <p className="text-sm font-semibold tabular-nums">{formatBaht(b.amount)}</p>
                    <div className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(b.amount / maxAmount) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted">
                      {b.count.toLocaleString('th-TH')} รายการ · ค่าธรรมเนียม {formatBaht(b.fee)} ({b.channel.feePct}%)
                    </p>
                    <p className="text-xs text-muted">เงินเข้า {b.channel.settlement}</p>
                  </li>
                ))}
              </ol>
            </Card>
            <div className="flex flex-col gap-3">
              <Card>
                <CardHeader title="เก็บเงินปลายทาง (COD)" description="ไม่ผ่าน Beam — เงินสดเข้าเมื่อขนส่งนำส่งสำเร็จ" />
                <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
                  <div>
                    <dt className="text-xs text-muted">เก็บแล้ว</dt>
                    <dd className="text-xl font-bold">{formatBaht(codCollected)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">รอเก็บ (ยังไม่ถึงมือ)</dt>
                    <dd className="text-xl font-bold text-warn">{formatBaht(codPending)}</dd>
                  </div>
                  <div className="col-span-2 text-xs text-muted">{codOrders.length.toLocaleString('th-TH')} ออเดอร์ COD · สัดส่วน {orders.length ? Math.round((codOrders.length / orders.length) * 100) : 0}% ของทั้งหมด</div>
                </dl>
              </Card>
              <Card>
                <CardHeader title="ยอดสุทธิที่ Beam โอนเข้าร้าน" description="ยอดรับชำระ − ค่าธรรมเนียม − คืนเงิน (สรุปทั้งหมดใน ledger)" />
                <p className="p-5 text-3xl font-bold">{formatBaht(gross - fees - refunded)}</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip href={txHref({ status: undefined })} active={!status}>
              ทั้งหมด ({payments.length})
            </Chip>
            {STATUSES.map((s) => (
              <Chip key={s} href={txHref({ status: s })} active={status === s}>
                {PAYMENT_STATUS_LABEL[s]} ({payments.filter((p) => p.status === s).length})
              </Chip>
            ))}
            <form className="ml-auto flex gap-2">
              <input type="hidden" name="tab" value="transactions" />
              {status && <input type="hidden" name="status" value={status} />}
              <input type="search" name="q" defaultValue={q} placeholder="เลขที่ / อ้างอิง / ชื่อ / เบอร์" aria-label="ค้นหารายการชำระ" className="w-64!" />
            </form>
          </div>
          {rows.length === 0 ? (
            <Card>
              <p className="p-8 text-center text-sm text-muted">ไม่มีรายการ</p>
            </Card>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>เวลา</Th>
                  <Th>คำสั่งซื้อ</Th>
                  <Th>ช่องทาง</Th>
                  <Th className="text-right">ยอด</Th>
                  <Th className="text-right">ค่าธรรมเนียม</Th>
                  <Th className="text-right">สุทธิ</Th>
                  <Th>สถานะ</Th>
                  <Th>อ้างอิง Beam</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const refundedAmt = p.refunds.reduce((s, r) => s + r.amount, 0);
                  const refundable = p.status === 'succeeded' || p.status === 'partially_refunded' ? p.amount - refundedAmt : 0;
                  return (
                    <tr key={p.id} className="hover:bg-surface-alt/50">
                      <Td className="whitespace-nowrap text-muted">{formatDateTime(p.paidAt ?? p.createdAt)}</Td>
                      <Td>
                        <Link href={`/admin/orders/${p.orderId}`} className="font-mono font-medium hover:text-brand">
                          {p.orderNo}
                        </Link>
                        <span className="block text-xs text-muted">{p.customer.name}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {p.channel ? PAYMENT_CHANNEL_LABEL[p.channel] : '—'}
                        {p.installmentTerm && <span className="block text-xs text-muted">{p.installmentTerm} งวด</span>}
                      </Td>
                      <Td className="text-right tabular-nums">{formatBaht(p.amount)}</Td>
                      <Td className="text-right text-accent tabular-nums">{p.fee ? `-${formatBaht(p.fee)}` : '—'}</Td>
                      <Td className="text-right font-medium tabular-nums">{p.net ? formatBaht(p.net - refundedAmt) : '—'}</Td>
                      <Td>
                        <Badge tone={PAYMENT_STATUS_TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                        {refundedAmt > 0 && <span className="block text-xs text-muted">คืน {formatBaht(refundedAmt)}</span>}
                      </Td>
                      <Td className="font-mono text-xs text-muted">{p.reference ?? '—'}</Td>
                      <Td>
                        {refundable > 0 && (
                          <details className="relative">
                            <summary className="cursor-pointer text-xs font-medium text-brand">คืนเงิน</summary>
                            <form action={refundPaymentAction} className="absolute right-0 z-10 mt-1 grid w-56 gap-2 rounded-lg bg-surface p-3 shadow-lg border border-line">
                              <input type="hidden" name="paymentId" value={p.id} />
                              <input type="hidden" name="back" value={txHref({ page: String(page) })} />
                              <input name="amount" type="number" step="0.01" min={0.01} max={refundable / 100} defaultValue={(refundable / 100).toFixed(2)} aria-label="ยอดคืน (บาท)" className="h-9!" />
                              <input name="reason" placeholder="เหตุผล" aria-label="เหตุผล" className="h-9!" />
                              <Button type="submit" size="sm" variant="secondary">
                                ยืนยันคืนเงิน
                              </Button>
                            </form>
                          </details>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {pages > 1 && (
            <nav aria-label="แบ่งหน้า" className="mt-4 flex items-center justify-between gap-2 text-sm">
              <p className="text-muted">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, matched.length)} จาก {matched.length.toLocaleString('th-TH')} รายการ
              </p>
              <div className="flex gap-2">
                <PageLink href={txHref({ page: String(page - 1) })} disabled={page <= 1}>
                  ก่อนหน้า
                </PageLink>
                <span className="px-2 py-1.5 text-muted">
                  หน้า {page} / {pages}
                </span>
                <PageLink href={txHref({ page: String(page + 1) })} disabled={page >= pages}>
                  ถัดไป
                </PageLink>
              </div>
            </nav>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid gap-3 lg:grid-cols-[1fr_340px] lg:items-start">
          <form action={updateBeamSettings} className="flex flex-col gap-3">
            <Card>
              <CardHeader title="บัญชี Beam" description="ค่าจากแดชบอร์ด Beam (Developers › API keys) · Secret key ของจริงต้องเก็บใน environment ไม่ใช่ไฟล์ตั้งค่า" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                  <input type="checkbox" name="beamEnabled" defaultChecked={beam.enabled} className="accent-brand" />
                  เปิดรับชำระผ่าน Beam
                </label>
                <Field label="โหมด" htmlFor="mode" hint="sandbox = ทดสอบ ไม่ตัดเงินจริง">
                  <Select id="mode" name="mode" defaultValue={beam.mode} options={[{ value: 'sandbox', label: 'Sandbox (ทดสอบ)' }, { value: 'live', label: 'Live (ใช้งานจริง)' }]} />
                </Field>
                <Field label="Merchant ID" htmlFor="merchantId">
                  <input id="merchantId" name="merchantId" defaultValue={beam.merchantId} placeholder="mch_xxxxxxxx" className="font-mono" />
                </Field>
                <Field label="Public key" htmlFor="publicKey">
                  <input id="publicKey" name="publicKey" defaultValue={beam.publicKey} placeholder="pk_test_…" className="font-mono" />
                </Field>
                <Field label="Secret key" htmlFor="secretKey" hint={beam.secretKeyLast4 ? `ตั้งไว้แล้ว (ลงท้าย …${beam.secretKeyLast4}) — กรอกใหม่เพื่อเปลี่ยน` : 'ยังไม่ได้ตั้ง'}>
                  <input id="secretKey" name="secretKey" type="password" placeholder="sk_test_…" autoComplete="off" className="font-mono" />
                </Field>
                <Field label="Webhook URL" hint="ตั้งใน Beam ให้ยิงมาที่นี่ · เหตุการณ์: payment.succeeded / failed / expired / refund.succeeded">
                  <input readOnly value="https://<โดเมนร้าน>/api/payments/beam/webhook" className="font-mono text-muted" aria-label="Webhook URL" />
                </Field>
                <Field label="อายุรายการชำระ (นาที)" htmlFor="expiryMinutes" hint="ลูกค้าต้องจ่ายภายในเวลานี้ ไม่งั้นรายการหมดอายุ">
                  <input id="expiryMinutes" name="expiryMinutes" type="number" min={5} max={1440} defaultValue={beam.expiryMinutes} />
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="ช่องทางที่เปิดรับ" description="ปิด/เปิดได้ตามที่ทำสัญญากับ Beam · ค่าธรรมเนียมเป็นตัวอย่าง ต้องดูจากสัญญาจริง" />
              <ul className="divide-y divide-line">
                {BEAM_CHANNELS.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <label className="flex min-w-0 flex-1 basis-60 cursor-pointer items-center gap-3">
                      <input type="checkbox" name={`channel:${c.id}`} defaultChecked={beam.channels[c.id] !== false} className="accent-brand" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {c.name} <span className="text-xs font-normal text-muted">· {BEAM_GROUP_LABEL[c.group]}</span>
                        </span>
                        <span className="block truncate text-xs text-muted">{c.desc}</span>
                      </span>
                    </label>
                    <span className="text-xs text-muted tabular-nums">
                      ค่าธรรมเนียม {c.feePct}%{c.feeFixed ? ` + ${formatBaht(c.feeFixed)}` : ''} · เงินเข้า {c.settlement}
                      {c.minAmount > 100 && ` · ขั้นต่ำ ${formatBaht(c.minAmount)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="เก็บเงินปลายทาง" description="ทางเลือกนอก Beam — ขนส่งเก็บเงินสดแล้วโอนคืนร้าน" />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="codEnabled" defaultChecked={settings.payments.cod.enabled} className="accent-brand" />
                  เปิดรับ COD
                </label>
                <Field label="ค่าธรรมเนียม COD (บาท/ออเดอร์)" htmlFor="codFee" hint="0 = ร้านรับภาระเอง">
                  <input id="codFee" name="codFee" type="number" min={0} step="1" defaultValue={settings.payments.cod.fee / 100} />
                </Field>
              </div>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">บันทึกการตั้งค่า</Button>
              <Button type="submit" variant="secondary" formAction={testBeamConnection}>
                ทดสอบการเชื่อมต่อ
              </Button>
            </div>
          </form>

          <Card>
            <CardHeader title="Beam ทำอะไรได้บ้าง" description="สิ่งที่ระบบนี้จำลองไว้แล้ว vs ที่ต้องต่อเพิ่มตอนใช้จริง" />
            <ul className="flex flex-col gap-3 p-5 text-sm">
              {BEAM_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-2">
                  {f.mocked ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                  <span>
                    <span className="font-medium">{f.title}</span>
                    <span className="block text-xs text-muted">{f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">ขั้นตอนต่อจริง: สมัคร Beam → รับ API keys → ใส่ที่นี่ → ตั้ง webhook → ทดสอบใน sandbox → สลับ live</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'accent' }) {
  return (
    <div className="rounded-card bg-surface p-4 border border-line">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', tone === 'accent' && 'text-accent')}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors', active ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:bg-surface-alt')}>
      {children}
    </Link>
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
