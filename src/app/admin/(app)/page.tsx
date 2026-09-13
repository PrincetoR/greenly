import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { roleCan } from '@/lib/auth/roles';
import { listOrders } from '@/lib/db/orders';
import { listProducts } from '@/lib/db/products';
import { listCategories } from '@/lib/db/categories';
import { loadPromotionContext } from '@/lib/promotions/service';
import { promotionStatus, PROMOTION_STATUS_LABEL } from '@/lib/pricing/status';
import { formatBaht } from '@/lib/money';
import { formatRange } from '@/lib/datetime';
import { parseRange, RANGES } from '@/lib/analytics/periods';
import { salesReport } from '@/lib/analytics/sales';
import { promotionReport } from '@/lib/analytics/promotions';
import { categoryReport, topProducts } from '@/lib/analytics/categories';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Td, Th } from '@/components/ui/table';
import { BarChart, Delta, RangeTabs, Stat } from '@/components/admin/analytics';
import { PromoTypeIcon } from '@/components/shop/promo-type-icon';
import { ProductImage } from '@/components/product-image';

export const metadata = { title: 'แดชบอร์ด' };

/**
 * แดชบอร์ด = KPI 4 ใบ (กดไปดูรายละเอียด) + สถิติที่วิเคราะห์ได้จริง (พี่ต่อไม่เอารายการละเอียดซ้ำกับหน้าอื่น)
 * ช่วงเวลาเลือกผ่าน ?range=day|month|year — ทุกการ์ดสถิติใช้ช่วงเดียวกัน
 */
export default async function AdminDashboard({ searchParams }: PageProps<'/admin'>) {
  const [session, sp] = await Promise.all([requireSession(), searchParams]);
  const [orders, products, categories, ctx] = await Promise.all([listOrders(), listProducts(), listCategories(), loadPromotionContext()]);
  const { settings, promotions, usage, now } = ctx;
  const range = parseRange(sp.range);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const active = orders.filter((o) => o.status !== 'cancelled');
  const today = active.filter((o) => new Date(o.createdAt) >= startOfToday);
  const revenueToday = today.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === 'pending');
  const lowStock = products.filter((p) => p.active && p.stock <= settings.lowStockThreshold);
  const live = promotions.filter((p) => promotionStatus(p, now, usage[p.id]) === 'live');
  const canOrders = roleCan(session.role, 'order.manage');
  const canPromo = roleCan(session.role, 'promotion.manage');

  const sales = salesReport(orders, range, now);
  const promo = promotionReport(orders, promotions, now, sales.window);
  const cats = categoryReport(orders, products, categories, sales.window, sales.previousWindow);
  const top = topProducts(orders, sales.window, 5);
  const hint = RANGES.find((r) => r.value === range)!.hint;
  const bestCat = cats[0]?.revenue > 0 ? cats[0].category.id : null;
  const worstCat = cats.length > 1 && cats[cats.length - 1].revenue < (cats[0]?.revenue ?? 0) ? cats[cats.length - 1].category.id : null;

  return (
    // ระยะทุกช่องเท่ากัน 16px (= gap คอลัมน์ซ้าย/ขวา และ gap การ์ดสินค้าหน้าร้าน) — พี่ต่อไม่เอา 12/24 ปนกัน
    // เป็น flex คอลัมน์ ไม่ใช่ grid: track ของ grid จะถ่างตาม min-content ของตารางข้างใน (overflow-x-auto ไม่ช่วย) จนหน้าเลื่อนข้างได้
    <div className="flex flex-col gap-4">
      {/* ไม่มีหัวข้อ/บรรทัดทักทาย (พี่ต่อเอาออก) — แถว KPI เริ่มที่ขอบบนเดียวกับ card "จัดการสินค้า" · ชื่อหน้าอยู่ใน metadata.title */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="ยอดขายวันนี้" value={formatBaht(revenueToday)} sub={`${today.length} ออเดอร์`} href={canOrders ? '/admin/orders' : undefined} />
        <Kpi label="รอยืนยัน/ชำระ" value={String(pending.length)} sub="ออเดอร์" href={canOrders ? '/admin/orders?status=pending' : undefined} tone={pending.length > 0 ? 'warn' : undefined} />
        <Kpi label="สินค้าใกล้หมด" value={String(lowStock.length)} sub={`≤ ${settings.lowStockThreshold} ชิ้น`} href="/admin/products?status=low" tone={lowStock.length > 0 ? 'danger' : undefined} />
        <Kpi label="โปรที่กำลังใช้งาน" value={String(live.length)} sub="โปรโมชัน" href={canPromo ? '/admin/promotions?status=live' : '/promotions'} />
      </div>

      {/* ยอดขายตามช่วงเวลา */}
      <Card>
        <CardHeader title="ยอดขาย" description={`${hint} · เทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน · ไม่นับออเดอร์ที่ยกเลิก`} action={<RangeTabs range={range} />} />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Stat label="ยอดขาย" value={formatBaht(sales.current.revenue)} sub={`ช่วงก่อน ${formatBaht(sales.previous.revenue)}`} delta={sales.change.revenue} />
          <Stat label="ออเดอร์" value={`${sales.current.orders.toLocaleString('th-TH')} ออเดอร์`} sub={`ช่วงก่อน ${sales.previous.orders.toLocaleString('th-TH')}`} delta={sales.change.orders} />
          <Stat label="เฉลี่ยต่อออเดอร์" value={formatBaht(sales.current.aov)} sub={`ช่วงก่อน ${formatBaht(sales.previous.aov)}`} delta={sales.change.aov} />
        </div>
        <div className="px-5 pb-5">
          <BarChart points={sales.points} labelEvery={range === 'day' ? 5 : 1} />
        </div>
      </Card>

      {/* โปรโมชันกระตุ้นยอดขายได้ไหม */}
      <Card>
        {/* ไม่มีแถวสรุปรวม (สัดส่วนออเดอร์ที่ใช้โปร / AOV / ส่วนลดรวม) — พี่ต่อ: เป็นค่าเฉลี่ยรวม ไม่ใช่ข้อมูลเฉพาะโปร ดูแล้วงง เอาเฉพาะตารางรายโปร */}
        <CardHeader
          title="โปรโมชันกระตุ้นยอดขาย"
          description="ยอดขายเฉลี่ยต่อวันระหว่างที่โปรเปิด เทียบกับช่วงก่อนเริ่มโปรที่ยาวเท่ากัน — ยังไม่ตัดปัจจัยอื่น (ฤดูกาล โปรซ้อน) ใช้เป็นสัญญาณให้ดูต่อ"
        />
        {promo.items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted">ไม่มีโปรโมชันที่เปิดในช่วงนี้</p>
        ) : (
          <div className="p-5">
            <Table>
              <thead>
                <tr>
                  <Th>โปรโมชัน</Th>
                  <Th className="text-right whitespace-nowrap">ออเดอร์ที่ใช้</Th>
                  <Th className="text-right whitespace-nowrap">ยอดขายจากโปร</Th>
                  <Th className="text-right whitespace-nowrap">ส่วนลดที่ให้</Th>
                  <Th className="text-right whitespace-nowrap">ยอดขาย/วัน</Th>
                  <Th className="whitespace-nowrap">เทียบก่อนโปร</Th>
                </tr>
              </thead>
              <tbody>
                {promo.items.map((it) => {
                  const st = promotionStatus(it.promotion, now, usage[it.promotion.id]);
                  return (
                    <tr key={it.promotion.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <PromoTypeIcon type={it.promotion.type} className="size-4 shrink-0 text-muted" />
                          <div className="min-w-0">
                            {canPromo ? (
                              <Link href={`/admin/promotions/${it.promotion.id}`} className="block truncate font-medium hover:underline">
                                {it.promotion.name}
                              </Link>
                            ) : (
                              <p className="truncate font-medium">{it.promotion.name}</p>
                            )}
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted whitespace-nowrap">
                              <Badge tone={st === 'live' ? 'ok' : 'neutral'}>{PROMOTION_STATUS_LABEL[st]}</Badge>
                              {formatRange(it.promotion.startsAt, it.promotion.endsAt)}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums">{it.orders.toLocaleString('th-TH')}</Td>
                      <Td className="text-right font-medium tabular-nums">{formatBaht(it.revenue)}</Td>
                      <Td className="text-right text-accent tabular-nums whitespace-nowrap">{it.discount > 0 ? `−${formatBaht(it.discount)}` : '—'}</Td>
                      <Td className="text-right tabular-nums whitespace-nowrap">
                        {formatBaht(it.perDayDuring)}
                        <span className="block text-xs text-muted">ก่อนโปร {formatBaht(it.perDayBefore)}</span>
                      </Td>
                      <Td>
                        <Delta value={it.uplift} label="" />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* min-w-0 ที่ card: ไม่งั้น track ของ grid ถ่างตามชื่อหมวด/สินค้าที่ยาว (truncate ไม่ทำงาน) จนหน้าเลื่อนข้างได้บนมือถือ */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* หมวดหมู่ขายดี / ขายไม่ดี */}
        <Card className="min-w-0">
          <CardHeader title="หมวดหมู่ไหนขายดี" description={`สัดส่วนรายได้ ${hint} · เทียบช่วงก่อนหน้า · ไม่นับของแถม`} />
          <ol className="flex flex-col gap-4 p-5">
            {cats.map((c) => (
              <li key={c.category.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                  <span className="truncate">{c.category.name}</span>
                  {c.category.id === bestCat && <Badge tone="ok">ขายดีสุด</Badge>}
                  {c.category.id === worstCat && <Badge tone="warn">ขายน้อยสุด</Badge>}
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatBaht(c.revenue)}</p>
                <div className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${c.share}%` }} />
                </div>
                <p className="text-xs text-muted">
                  {c.share.toLocaleString('th-TH', { maximumFractionDigits: 1 })}% · {c.qty.toLocaleString('th-TH')} ชิ้น · {c.orders.toLocaleString('th-TH')} ออเดอร์
                </p>
                <Delta value={c.change} label="" />
              </li>
            ))}
          </ol>
        </Card>

        {/* สินค้าขายดี */}
        <Card className="min-w-0">
          <CardHeader title="สินค้าขายดี 5 อันดับ" description={`ตามจำนวนชิ้นที่ขายได้ ${hint}`} />
          {top.length === 0 ? (
            <p className="p-5 text-sm text-muted">ยังไม่มีออเดอร์ในช่วงนี้</p>
          ) : (
            <ol className="flex flex-col gap-4 p-5">
              {top.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-muted tabular-nums">{i + 1}</span>
                  <ProductImage src={p.image} alt="" className="size-12 rounded-md border border-line" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.productId}`} className="block truncate text-sm font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted">{p.qty.toLocaleString('th-TH')} ชิ้น</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatBaht(p.revenue)}</p>
                </li>
              ))}
            </ol>
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
