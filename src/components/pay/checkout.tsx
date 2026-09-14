'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { Building2, Check, CreditCard, Globe, QrCode, Smartphone, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Select } from '@/components/ui/select';
import { formatBaht } from '@/lib/money';
import { BEAM_GROUP_LABEL, type BeamChannel, type BeamChannelId } from '@/lib/payments/beam';
import { settleMockPaymentAction } from '@/lib/actions/payments';

/**
 * หน้าเลือกวิธีชำระเงิน "ของแอป" (พี่ต่อสั่ง 2026-09-15): ไม่โชว์ว่าเป็น Beam — ของจริงหลังบ้านจะเชื่อม API Beam เอง ไม่ใช้ hosted checkout
 * จอใหญ่: ซ้ายสรุปยอด (sticky) · ขวา = รายการวิธีชำระ (คอลัมน์ซ้าย) + รายละเอียดของที่เลือก (ขวา)
 * มือถือ: สรุปยอดย่อ → รายการวิธีชำระเป็นแถวใหญ่แบบ accordion (กดแล้วรายละเอียดกางใต้แถวนั้นเลย) → แถบ [ยอด · ชำระเงิน] ติดล่างจอ
 * ปุ่ม "ชำระเงิน" ในโหมดสาธิต = บันทึกผลสำเร็จทันที (ของจริงลูกค้าไปยืนยันในแอปธนาคาร/บัตร แล้ว webhook แจ้งผล)
 */
const GROUP_ICON = { qr: QrCode, card: CreditCard, bank: Building2, wallet: Wallet, intl: Globe, credit: Smartphone } as const;

const mq = '(max-width: 767px)';
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(mq);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
/** จอแคบ = รายละเอียดกางใต้แถวที่เลือก (accordion) · จอกว้าง = แผงขวา — ใช้ store ให้สลับตอน hydrate โดยไม่ต้อง render ซ้ำ 2 ชุด */
const useMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mq).matches,
    () => false,
  );

export function PaymentCheckout({
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
  const mobile = useMobile();
  const [channel, setChannel] = useState<BeamChannelId>(channels[0]?.id ?? 'promptpay');
  const [term, setTerm] = useState<number | null>(channels[0]?.terms?.[0] ?? null);
  const [option, setOption] = useState<string>(channels[0]?.options?.[0] ?? '');
  const [pending, startTransition] = useTransition();
  const [left, setLeft] = useState<number>(() => Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000)));
  const current = channels.find((c) => c.id === channel) ?? channels[0];
  const listRef = useRef<HTMLUListElement>(null);

  // เปลี่ยนวิธี → รีเซ็ตตัวเลือกย่อย (ธนาคาร/งวด) เป็นค่าแรกของวิธีใหม่
  const choose = (c: BeamChannel) => {
    setChannel(c.id);
    setTerm(c.terms?.[0] ?? null);
    setOption(c.options?.[0] ?? '');
  };

  // นับถอยหลังอายุรายการ
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
    return <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted">ไม่มีวิธีชำระที่รองรับยอดนี้</p>;
  }

  const detail = (
    <ChannelDetail current={current} payment={payment} option={option} setOption={setOption} term={term} setTerm={setTerm} />
  );
  const payButton = (className?: string) => (
    <button type="button" onClick={() => settle('succeeded')} disabled={pending || left === 0} className={cn('h-12 rounded-lg bg-brand text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60', className)}>
      {pending ? 'กำลังดำเนินการ…' : `ชำระเงิน ${formatBaht(payment.amount)}`}
    </button>
  );

  return (
    // grid-cols-1 (minmax(0,1fr)) กัน track ถ่างตาม min-content ของลูกบนมือถือ
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-4 py-4 pb-28 md:grid-cols-[300px_1fr] md:items-start md:gap-4 md:py-6 md:pb-8">
      {/* สรุปยอด — มือถือย่อเป็นแถวเดียว · จอใหญ่เป็นการ์ดเต็ม sticky */}
      <aside className="rounded-card bg-surface p-4 border border-line md:sticky md:top-[81px] md:p-5">
        <div className="flex items-center justify-between gap-3 md:block">
          <div>
            <p className="text-xs text-muted">ยอดชำระ · {merchant}</p>
            <p className="text-2xl font-bold md:mt-1 md:text-3xl">{formatBaht(payment.amount)}</p>
            <p className="font-mono text-xs text-muted">{payment.orderNo}</p>
          </div>
          <p className={cn('shrink-0 rounded-lg px-3 py-1.5 text-center text-sm font-semibold tabular-nums md:mt-4', left < 120 ? 'bg-danger-soft text-danger' : 'bg-surface-alt text-ink')} aria-live="polite">
            <span className="block text-[11px] font-normal text-muted">หมดเวลาใน</span>
            {mm}:{ss}
          </p>
        </div>
        <ul className="mt-3 hidden flex-col gap-1 border-t border-line pt-3 text-xs text-muted md:flex">
          {items.slice(0, 5).map((it) => (
            <li key={it.name} className="flex justify-between gap-2">
              <span className="truncate">{it.name}</span>
              <span className="shrink-0">× {it.qty}</span>
            </li>
          ))}
          {items.length > 5 && <li>และอีก {items.length - 5} รายการ</li>}
        </ul>
      </aside>

      <section className="rounded-card bg-surface border border-line">
        <div className="border-b border-line px-4 py-3 md:px-5 md:py-4">
          <h1 className="font-semibold">เลือกวิธีชำระเงิน</h1>
          <p className="text-xs text-muted">ลูกค้าจ่ายเท่ายอดที่แสดง ไม่มีค่าธรรมเนียมเพิ่ม · ข้อมูลการชำระเงินเข้ารหัสทั้งหมด</p>
        </div>
        {error && <p className="mx-4 mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger md:mx-5">เลือกวิธีชำระไม่ถูกต้อง</p>}

        <div className="md:grid md:grid-cols-[240px_1fr]">
          {/* รายการวิธีชำระ — แถวใหญ่กดง่าย มีวงกลมติ๊ก · มือถือรายละเอียดกางใต้แถว */}
          <ul ref={listRef} className="flex flex-col gap-2 p-3 md:border-r md:border-line" role="tablist" aria-label="วิธีชำระเงิน" aria-orientation="vertical">
            {channels.map((c) => {
              const Icon = GROUP_ICON[c.group];
              const on = c.id === channel;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => choose(c)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors border',
                      on ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-surface-alt',
                    )}
                  >
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', on ? 'bg-brand text-white' : 'bg-surface-alt text-muted')} aria-hidden>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-semibold', on && 'text-brand')}>{c.name}</span>
                      <span className="block truncate text-xs text-muted">{mobile ? c.desc : BEAM_GROUP_LABEL[c.group]}</span>
                    </span>
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-brand bg-brand text-white' : 'border-line')} aria-hidden>
                      {on && <Check className="size-3.5" />}
                    </span>
                  </button>
                  {/* มือถือ: accordion — รายละเอียดของวิธีที่เลือกกางใต้แถว */}
                  {mobile && on && (
                    <div className="mt-2 rounded-lg bg-surface-alt/60 p-4" role="tabpanel">
                      {detail}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* จอใหญ่: แผงรายละเอียดด้านขวา */}
          {!mobile && (
            <div className="p-5" role="tabpanel">
              <h2 className="font-semibold">{current.name}</h2>
              <p className="text-xs text-muted">{current.desc}</p>
              <div className="mt-4">{detail}</div>
              <div className="mt-6 flex flex-col gap-2">
                {payButton('w-full')}
                <DemoLinks orderNo={payment.orderNo} pending={pending} onFail={() => settle('failed')} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* มือถือ: แถบชำระเงินติดล่างจอ */}
      {mobile && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted">{current.name}</p>
              <p className="text-lg font-bold leading-6">{formatBaht(payment.amount)}</p>
            </div>
            {payButton('ml-auto min-w-40 px-5')}
          </div>
          <DemoLinks orderNo={payment.orderNo} pending={pending} onFail={() => settle('failed')} className="mt-2" />
        </div>
      )}
    </div>
  );
}

/** ลิงก์ช่วยสาธิต (ไม่สำเร็จ / ยกเลิก) — เล็ก ๆ ใต้ปุ่มชำระ */
function DemoLinks({ orderNo, pending, onFail, className }: { orderNo: string; pending: boolean; onFail: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 text-xs', className)}>
      <button type="button" onClick={onFail} disabled={pending} className="text-muted underline-offset-2 hover:underline">
        จำลอง: ชำระไม่สำเร็จ
      </button>
      <a href={`/order/${orderNo}`} className="text-muted underline-offset-2 hover:underline">
        ยกเลิก กลับไปที่คำสั่งซื้อ
      </a>
    </div>
  );
}

function ChannelDetail({
  current,
  payment,
  option,
  setOption,
  term,
  setTerm,
}: {
  current: BeamChannel;
  payment: { id: string; amount: number };
  option: string;
  setOption: (v: string) => void;
  term: number | null;
  setTerm: (v: number) => void;
}) {
  if (current.group === 'qr' || current.group === 'intl') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg bg-surface p-5 border border-line">
        <MockQr seed={payment.id + current.id} />
        <p className="text-sm font-semibold">{formatBaht(payment.amount)}</p>
        <p className="text-center text-xs text-muted">
          {current.group === 'qr' ? 'เปิดแอปธนาคาร → สแกน QR → ยืนยันยอด · QR นี้ใช้ได้ครั้งเดียว' : `สแกนด้วยแอป ${current.name} ยอดจะถูกแปลงเป็นสกุลเงินของลูกค้าอัตโนมัติ`}
        </p>
      </div>
    );
  }
  if (current.group === 'card') {
    return (
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
        <p className="text-[11px] text-muted">ข้อมูลบัตรเข้ารหัสและส่งตรงถึงผู้ให้บริการชำระเงิน ร้านไม่เห็นเลขบัตร · ธนาคารอาจให้ยืนยัน OTP (3-D Secure)</p>
      </div>
    );
  }
  if (current.group === 'bank') {
    return (
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="เลือกธนาคาร">
        {current.options?.map((b) => (
          <label key={b} className={cn('flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm border transition-colors', option === b ? 'border-brand text-brand' : 'border-line hover:bg-surface-alt')}>
            <input type="radio" name="bank" checked={option === b} onChange={() => setOption(b)} className="accent-brand" />
            {b}
          </label>
        ))}
        <p className="text-[11px] text-muted sm:col-span-2">กด “ชำระเงิน” แล้วระบบจะเปิดแอปธนาคารให้ยืนยันด้วย PIN</p>
      </div>
    );
  }
  if (current.group === 'wallet') {
    return (
      <div className="grid gap-3">
        {current.id === 'truemoney' && (
          <label className="text-xs font-medium">
            เบอร์ TrueMoney Wallet
            <input inputMode="tel" placeholder="08x-xxx-xxxx" className="mt-1" aria-label="เบอร์ TrueMoney (จำลอง)" />
          </label>
        )}
        <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted border border-line">กด “ชำระเงิน” แล้วจะเปิดแอป {current.name} เพื่อยืนยัน · บนคอมพิวเตอร์จะแสดง QR ให้สแกนแทน</p>
      </div>
    );
  }
  // credit = ผ่อนชำระ / ซื้อก่อนจ่ายทีหลัง
  return (
    <div className="grid gap-3">
      {current.options && (
        <label className="text-xs font-medium">
          ธนาคารผู้ออกบัตร
          <Select value={option} onChange={setOption} className="mt-1 w-full" aria-label="ธนาคาร" options={current.options.map((b) => ({ value: b, label: b }))} />
        </label>
      )}
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="จำนวนงวด">
        {(current.terms ?? []).map((t) => (
          <label key={t} className={cn('cursor-pointer rounded-lg bg-surface px-3 py-2 text-sm border transition-colors', term === t ? 'border-brand text-brand' : 'border-line hover:bg-surface-alt')}>
            <input type="radio" name="term" checked={term === t} onChange={() => setTerm(t)} className="sr-only" />
            <span className="block font-semibold">{t} งวด</span>
            <span className="block text-xs text-muted">{formatBaht(Math.ceil(payment.amount / t))}/เดือน · 0%</span>
          </label>
        ))}
      </div>
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
