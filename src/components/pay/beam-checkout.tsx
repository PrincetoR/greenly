'use client';

import { useEffect, useState, useTransition } from 'react';
import { Building2, CreditCard, Globe, QrCode, Smartphone, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/select';
import { formatBaht } from '@/lib/money';
import { BEAM_GROUP_LABEL, type BeamChannel, type BeamChannelId } from '@/lib/payments/beam';
import { settleMockPaymentAction } from '@/lib/actions/payments';

/**
 * หน้าเลือกช่องทางชำระแบบ Beam (จำลอง) — โครงเลียนแบบ hosted checkout ทั่วไป: ซ้ายสรุปยอด ขวาเลือกช่องทาง
 * ปุ่ม "ชำระเงิน" = จำลองผลสำเร็จ (ของจริงคือลูกค้าไปยืนยันในแอปธนาคาร/บัตร แล้ว Beam ยิง webhook)
 */
const GROUP_ICON = { qr: QrCode, card: CreditCard, bank: Building2, wallet: Wallet, intl: Globe, credit: Smartphone } as const;

export function BeamCheckout({
  payment,
  merchant,
  channels,
  items,
  error,
}: {
  payment: { id: string; orderNo: string; amount: number; expiresAt: string };
  merchant: string;
  channels: BeamChannel[];
  items: { name: string; qty: number }[];
  error: string | null;
}) {
  const [channel, setChannel] = useState<BeamChannelId>(channels[0]?.id ?? 'promptpay');
  const [term, setTerm] = useState<number | null>(channels[0]?.terms?.[0] ?? null);
  const [option, setOption] = useState<string>(channels[0]?.options?.[0] ?? '');
  // เปลี่ยนช่องทาง → รีเซ็ตตัวเลือกย่อย (ธนาคาร/งวด) ให้เป็นค่าแรกของช่องทางใหม่
  const choose = (c: BeamChannel) => {
    setChannel(c.id);
    setTerm(c.terms?.[0] ?? null);
    setOption(c.options?.[0] ?? '');
  };
  const [pending, startTransition] = useTransition();
  const [left, setLeft] = useState<number>(() => Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)));
  const current = channels.find((c) => c.id === channel) ?? channels[0];

  // นับถอยหลังอายุรายการ — Beam จริงจะยกเลิก session ให้เองเมื่อหมดเวลา
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [payment.expiresAt]);


  const settle = (outcome: 'succeeded' | 'failed') => {
    const fd = new FormData();
    fd.set('paymentId', payment.id);
    fd.set('channel', channel);
    fd.set('outcome', outcome);
    if (term) fd.set('term', String(term));
    startTransition(() => settleMockPaymentAction(fd));
  };
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  if (!current) {
    return <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted">ไม่มีช่องทางที่รองรับยอดนี้</p>;
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-[300px_1fr] md:items-start">
      {/* สรุปรายการ */}
      <aside className="rounded-lg bg-surface p-5 border border-line md:sticky md:top-4">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">ชำระให้</p>
        <p className="mt-1 text-lg font-bold">{merchant}</p>
        <p className="mt-4 text-xs text-muted">ยอดชำระ</p>
        <p className="text-3xl font-bold">{formatBaht(payment.amount)}</p>
        <p className="mt-1 font-mono text-xs text-muted">{payment.orderNo}</p>
        <ul className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-xs text-muted">
          {items.slice(0, 4).map((it) => (
            <li key={it.name} className="flex justify-between gap-2">
              <span className="truncate">{it.name}</span>
              <span className="shrink-0">× {it.qty}</span>
            </li>
          ))}
          {items.length > 4 && <li>และอีก {items.length - 4} รายการ</li>}
        </ul>
        <p className={cn('mt-4 rounded-md px-3 py-2 text-center text-sm font-semibold tabular-nums', left < 120 ? 'bg-danger-soft text-danger' : 'bg-surface-alt text-ink')} aria-live="polite">
          หมดเวลาใน {mm}:{ss}
        </p>
      </aside>

      <section className="rounded-lg bg-surface border border-line">
        <div className="border-b border-line px-5 py-4">
          <h1 className="font-semibold">เลือกวิธีชำระเงิน</h1>
          <p className="text-xs text-muted">รองรับ {channels.length} ช่องทาง · ค่าธรรมเนียมร้านเป็นผู้รับผิดชอบ ลูกค้าจ่ายเท่ายอดที่แสดง</p>
        </div>
        {error && <p className="mx-5 mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">เลือกช่องทางไม่ถูกต้อง</p>}

        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          {/* รายการช่องทาง */}
          <ul className="flex gap-1 overflow-x-auto border-b border-line p-3 md:flex-col md:border-r md:border-b-0" role="tablist" aria-label="ช่องทางชำระเงิน">
            {channels.map((c) => {
              const Icon = GROUP_ICON[c.group];
              const on = c.id === channel;
              return (
                <li key={c.id} className="shrink-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => choose(c)}
                    className={cn('flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors', on ? 'bg-ink text-white' : 'hover:bg-surface-alt')}
                  >
                    <Icon className={cn('size-4 shrink-0', on ? 'text-white' : 'text-muted')} aria-hidden />
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className={cn('hidden text-[11px] md:block', on ? 'text-white/70' : 'text-muted')}>{BEAM_GROUP_LABEL[c.group]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* รายละเอียดช่องทางที่เลือก */}
          <div className="p-5" role="tabpanel">
            <h2 className="font-semibold">{current.name}</h2>
            <p className="text-xs text-muted">{current.desc}</p>

            <div className="mt-4">
              {(current.group === 'qr' || current.group === 'intl') && (
                <div className="flex flex-col items-center gap-3 rounded-lg bg-surface-alt p-5">
                  <MockQr seed={payment.id + current.id} />
                  <p className="text-sm font-semibold">{formatBaht(payment.amount)}</p>
                  <p className="text-center text-xs text-muted">
                    {current.group === 'qr' ? 'เปิดแอปธนาคาร → สแกน QR → ยืนยันยอด · QR นี้ใช้ได้ครั้งเดียว' : `สแกนด้วยแอป ${current.name} ยอดจะถูกแปลงเป็นสกุลเงินของลูกค้าอัตโนมัติ`}
                  </p>
                </div>
              )}

              {current.group === 'card' && (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {current.options?.map((b) => (
                      <span key={b} className="rounded-md bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {b}
                      </span>
                    ))}
                  </div>
                  <label className="text-xs font-medium">
                    หมายเลขบัตร
                    <input inputMode="numeric" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" className="mt-1" aria-label="หมายเลขบัตร (จำลอง)" />
                  </label>
                  <label className="text-xs font-medium">
                    ชื่อบนบัตร
                    <input placeholder="NAME SURNAME" defaultValue="DEMO CUSTOMER" className="mt-1" aria-label="ชื่อบนบัตร (จำลอง)" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium">
                      หมดอายุ
                      <input placeholder="MM/YY" defaultValue="12/29" className="mt-1" aria-label="วันหมดอายุ (จำลอง)" />
                    </label>
                    <label className="text-xs font-medium">
                      CVV
                      <input inputMode="numeric" placeholder="123" defaultValue="123" className="mt-1" aria-label="CVV (จำลอง)" />
                    </label>
                  </div>
                  <p className="text-[11px] text-muted">ข้อมูลบัตรไม่ผ่านร้านค้า — กรอกบนหน้า Beam เท่านั้น (3-D Secure จะเด้งไปยืนยัน OTP กับธนาคาร)</p>
                </div>
              )}

              {current.group === 'bank' && (
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="เลือกธนาคาร">
                  {current.options?.map((b) => (
                    <label key={b} className={cn('flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm border transition-colors', option === b ? 'border-ink bg-surface-alt' : 'border-line hover:bg-surface-alt')}>
                      <input type="radio" name="bank" checked={option === b} onChange={() => setOption(b)} className="accent-ink" />
                      {b}
                    </label>
                  ))}
                  <p className="text-[11px] text-muted sm:col-span-2">กด “ชำระเงิน” แล้วระบบจะเปิดแอปธนาคารให้ยืนยันด้วย PIN</p>
                </div>
              )}

              {current.group === 'wallet' && (
                <div className="grid gap-3">
                  {current.id === 'truemoney' && (
                    <label className="text-xs font-medium">
                      เบอร์ TrueMoney Wallet
                      <input inputMode="tel" placeholder="08x-xxx-xxxx" className="mt-1" aria-label="เบอร์ TrueMoney (จำลอง)" />
                    </label>
                  )}
                  <p className="rounded-md bg-surface-alt px-3 py-2 text-xs text-muted">กด “ชำระเงิน” แล้วจะเปิดแอป {current.name} เพื่อยืนยัน · บนคอมพิวเตอร์จะแสดง QR ให้สแกนแทน</p>
                </div>
              )}

              {current.group === 'credit' && (
                <div className="grid gap-3">
                  {current.options && (
                    <label className="text-xs font-medium">
                      ธนาคารผู้ออกบัตร
                      <Select value={option} onChange={setOption} className="mt-1 w-full" aria-label="ธนาคาร" options={current.options.map((b) => ({ value: b, label: b }))} />
                    </label>
                  )}
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="จำนวนงวด">
                    {(current.terms ?? []).map((t) => (
                      <label key={t} className={cn('cursor-pointer rounded-md px-3 py-2 text-sm border transition-colors', term === t ? 'border-ink bg-surface-alt' : 'border-line hover:bg-surface-alt')}>
                        <input type="radio" name="term" checked={term === t} onChange={() => setTerm(t)} className="sr-only" />
                        <span className="block font-semibold">{t} งวด</span>
                        <span className="block text-xs text-muted">{formatBaht(Math.ceil(payment.amount / t))}/เดือน · 0%</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button type="button" onClick={() => settle('succeeded')} disabled={pending || left === 0} className="h-12 w-full rounded-md bg-ink text-base font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60">
                {pending ? 'กำลังดำเนินการ…' : `ชำระเงิน ${formatBaht(payment.amount)}`}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button type="button" onClick={() => settle('failed')} disabled={pending} className="text-muted underline-offset-2 hover:underline">
                  จำลอง: ชำระไม่สำเร็จ
                </button>
                <a href={`/order/${payment.orderNo}`} className="text-muted underline-offset-2 hover:underline">
                  ยกเลิก กลับไปที่คำสั่งซื้อ
                </a>
              </div>
              <p className="text-[11px] text-muted">ปุ่ม “ชำระเงิน” ในโหมดจำลอง = แจ้งผลสำเร็จเหมือน Beam ส่ง webhook มาที่ร้าน</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** QR จำลอง — ลายสุ่มจาก seed (คงที่ต่อรายการ) แค่ให้เห็นภาพ ไม่ใช่ QR จริง */
function MockQr({ seed }: { seed: string }) {
  const n = 25;
  let h = 2166136261;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= seed.charCodeAt(i % seed.length);
    h = Math.imul(h, 16777619) >>> 0;
    cells.push(((h >>> 13) & 1) === 1);
  }
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-44 rounded-md bg-white p-1" aria-label="QR จำลอง" role="img" shapeRendering="crispEdges">
      {cells.map((on, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        if (finder(x, y)) {
          const lx = x < 7 ? x : x - (n - 7);
          const ly = y < 7 ? y : y - (n - 7);
          const ring = lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
          return ring ? <rect key={i} x={x} y={y} width={1} height={1} fill="#111" /> : null;
        }
        return on ? <rect key={i} x={x} y={y} width={1} height={1} fill="#111" /> : null;
      })}
    </svg>
  );
}
