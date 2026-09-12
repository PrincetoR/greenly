import type { Quote } from '@/lib/pricing/types';
import { formatBaht } from '@/lib/money';

/** สรุปยอด — ใช้ทั้งตะกร้าและ checkout ให้ตัวเลขชุดเดียวกัน */
export function OrderSummary({ quote, freeShippingMin }: { quote: Quote; freeShippingMin: number | null }) {
  const payable = quote.subtotal - quote.discountTotal;
  const toFree = freeShippingMin !== null && quote.shippingFee > 0 ? freeShippingMin - payable : null;
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <Row label="ยอดสินค้า" value={formatBaht(quote.subtotal)} />
      {quote.applied.map((a) => (
        <Row key={a.promotionId} label={a.type === 'coupon' ? `คูปอง ${a.name}` : a.name} value={`-${formatBaht(a.amount)}`} tone="accent" />
      ))}
      <Row label="ค่าจัดส่ง" value={quote.shippingFee === 0 ? 'ฟรี' : formatBaht(quote.shippingFee)} tone={quote.shippingFee === 0 ? 'ok' : undefined} />
      {toFree !== null && toFree > 0 && <p className="text-xs text-muted">ซื้อเพิ่มอีก {formatBaht(toFree)} เพื่อส่งฟรี</p>}
      <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-semibold">ยอดชำระ</dt>
        <dd className="text-2xl font-bold">{formatBaht(quote.total)}</dd>
      </div>
      {quote.discountTotal > 0 && <p className="text-right text-xs text-ok">ประหยัดไป {formatBaht(quote.discountTotal)}</p>}
    </dl>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'ok' }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={tone === 'accent' ? 'font-medium text-accent' : tone === 'ok' ? 'font-medium text-ok' : ''}>{value}</dd>
    </div>
  );
}
