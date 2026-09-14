import { changeOrderStatus } from '@/lib/actions/orders';
import { NEXT_STATUS, TRANSITION_LABEL } from '@/lib/orders/labels';
import { CARRIERS } from '@/lib/shipping/carriers';
import type { Order, ShippingSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';

export const RETURN_REASONS = ['ไม่มีผู้รับ ติดต่อไม่ได้', 'ที่อยู่ไม่ชัดเจน', 'ผู้รับปฏิเสธรับสินค้า', 'กล่องเสียหายระหว่างขนส่ง', 'อื่น ๆ'];

/**
 * ปุ่ม/ฟอร์มเปลี่ยนสถานะ — ใช้ทั้งหน้ารายละเอียดและหน้าจัดส่ง (compact)
 * แต่ละ transition เป็น form ของตัวเอง ยิง changeOrderStatus พร้อมฟิลด์ที่สถานะนั้นต้องการ
 */
export function OrderActions({ order, shipping, back, compact = false }: { order: Order; shipping: ShippingSettings; back: string; compact?: boolean }) {
  const next = NEXT_STATUS[order.status];
  if (next.length === 0) return <p className="text-sm text-muted">สถานะสุดท้ายแล้ว</p>;
  const carriers = CARRIERS.filter((c) => shipping.carriers.includes(c.id));
  const beamPaid = order.payment?.provider === 'beam' && (order.payment.status === 'succeeded' || order.payment.status === 'partially_refunded');
  const size = compact ? 'sm' : 'md';

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-col gap-3'}>
      {next.includes('paid') && (
        <form action={changeOrderStatus}>
          <Hidden order={order} status="paid" back={back} />
          <Button type="submit" size={size}>
            {order.paymentMethod === 'cod' ? 'ยืนยันรับออเดอร์' : order.payment?.status === 'succeeded' ? 'รับเข้าคิวแพ็ค' : 'ยืนยันรับชำระเอง'}
          </Button>
        </form>
      )}
      {next.includes('packing') && (
        <form action={changeOrderStatus}>
          <Hidden order={order} status="packing" back={back} />
          <Button type="submit" size={size}>
            {order.status === 'returned' ? 'ส่งใหม่ (เริ่มแพ็ค)' : TRANSITION_LABEL.packing}
          </Button>
        </form>
      )}
      {next.includes('shipped') && (
        <form action={changeOrderStatus} className={compact ? 'flex flex-wrap items-center gap-2' : 'grid gap-2 rounded-lg bg-surface-alt p-3 sm:grid-cols-2'}>
          <Hidden order={order} status="shipped" back={back} />
          <label className="text-xs font-medium">
            <span className={compact ? 'sr-only' : ''}>ขนส่ง</span>
            <select name="carrier" defaultValue={order.shipment?.carrier ?? shipping.defaultCarrier} className={compact ? 'h-9! w-32!' : 'mt-1 h-9!'} aria-label="ขนส่ง">
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            <span className={compact ? 'sr-only' : ''}>เลขพัสดุ</span>
            <input name="trackingNo" defaultValue={order.shipment?.trackingNo ?? ''} required placeholder="เช่น KEX0012345678" className={compact ? 'h-9! w-40! font-mono uppercase' : 'mt-1 h-9! font-mono uppercase'} aria-label="เลขพัสดุ" />
          </label>
          {!compact && (
            <>
              <label className="text-xs font-medium">
                น้ำหนัก (กรัม)
                <input name="weightGrams" type="number" min={1} defaultValue={order.shipment?.weightGrams ?? ''} placeholder="500" className="mt-1 h-9!" />
              </label>
              <label className="text-xs font-medium">
                ขนาดกล่อง
                <select name="boxSize" defaultValue={order.shipment?.boxSize ?? ''} className="mt-1 h-9!">
                  <option value="">ไม่ระบุ</option>
                  {['A', 'B', 'C', 'D', 'E', 'ซองบับเบิล'].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <Button type="submit" size={size} className={compact ? '' : 'sm:col-span-2'}>
            {TRANSITION_LABEL.shipped}
          </Button>
        </form>
      )}
      {next.includes('done') && (
        <form action={changeOrderStatus}>
          <Hidden order={order} status="done" back={back} />
          <Button type="submit" size={size}>
            {TRANSITION_LABEL.done}
          </Button>
        </form>
      )}
      {next.includes('returned') && (
        <form action={changeOrderStatus} className={compact ? 'flex flex-wrap items-center gap-2' : 'grid gap-2 rounded-lg bg-surface-alt p-3'}>
          <Hidden order={order} status="returned" back={back} />
          <label className="text-xs font-medium">
            <span className={compact ? 'sr-only' : ''}>เหตุผลตีกลับ</span>
            <select name="note" className={compact ? 'h-9! w-48!' : 'mt-1 h-9!'} aria-label="เหตุผลตีกลับ">
              {RETURN_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary" size={size}>
            {TRANSITION_LABEL.returned}
          </Button>
        </form>
      )}
      {/* โหมดย่อ (ในตารางคิวจัดส่ง) ไม่โชว์ปุ่มยกเลิก — ยกเลิกทำจากหน้ารายละเอียด ลดโอกาสกดพลาดในคิว */}
      {next.includes('cancelled') && !compact && (
        <form action={changeOrderStatus}>
          <Hidden order={order} status="cancelled" back={back} />
          <ConfirmButton variant="danger" size={size} message={`ยกเลิกคำสั่งซื้อนี้? stock และสิทธิ์โปรโมชันจะถูกคืน${beamPaid ? ' และคืนเงินผ่าน Beam เต็มจำนวน' : ''}`}>
            {beamPaid ? 'ยกเลิก + คืนเงิน' : TRANSITION_LABEL.cancelled}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

function Hidden({ order, status, back }: { order: Order; status: string; back: string }) {
  return (
    <>
      <input type="hidden" name="id" value={order.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="back" value={back} />
    </>
  );
}
