import type { Order, OrderStatus, Shipment } from '@/lib/types';
import { carrierById } from './carriers';

/**
 * ไทม์ไลน์พัสดุแบบจำลอง — ของจริงต้องดึงจาก API ขนส่ง (Kerry/Flash/J&T มี API หรือใช้ตัวรวมอย่าง Shippop/Aftership)
 * สร้างเหตุการณ์ตามเวลาที่ผ่านไปตั้งแต่ส่ง (deterministic — โหลดกี่ครั้งก็ได้ชุดเดิม) · ส่งถึง/ตีกลับ ยึดตามสถานะออเดอร์ ไม่เดาเอง
 */
export interface TrackingEvent {
  at: string;
  title: string;
  location: string;
  /** เหตุการณ์ล่าสุด/สถานะปลายทาง */
  kind: 'info' | 'transit' | 'out' | 'delivered' | 'returned';
}

const H = 3_600_000;

/** จุดเวลาจำลอง (ชั่วโมงหลังส่ง) — พนักงานกำลังนำส่งที่ ~40 ชม. · เกิน 44 ชม. ถือว่าส่งถึง (ใช้ตอน "ซิงก์สถานะ") */
export const MOCK_OUT_FOR_DELIVERY_H = 40;
export const MOCK_DELIVERED_H = 44;

export function trackingTimeline(shipment: Shipment, status: OrderStatus, now: Date, destinationHint = ''): TrackingEvent[] {
  const carrier = carrierById(shipment.carrier);
  const t0 = new Date(shipment.shippedAt).getTime();
  const at = (h: number) => new Date(t0 + h * H).toISOString();
  const elapsedH = (now.getTime() - t0) / H;
  const hub = `ศูนย์คัดแยก ${carrier.short} (กรุงเทพฯ)`;
  const dest = destinationHint ? `สาขา ${destinationHint}` : 'สาขาปลายทาง';

  const plan: Array<{ h: number; title: string; location: string; kind: TrackingEvent['kind'] }> = [
    { h: 0, title: 'ร้านค้าสร้างรายการจัดส่ง', location: 'ร้านค้า', kind: 'info' },
    { h: 3, title: 'ขนส่งรับพัสดุแล้ว', location: 'จุดรับพัสดุ', kind: 'transit' },
    { h: 9, title: 'พัสดุถึงศูนย์คัดแยกต้นทาง', location: hub, kind: 'transit' },
    { h: 18, title: 'พัสดุออกจากศูนย์คัดแยก กำลังส่งต่อ', location: hub, kind: 'transit' },
    { h: 31, title: 'พัสดุถึงศูนย์กระจายสินค้าปลายทาง', location: dest, kind: 'transit' },
    { h: MOCK_OUT_FOR_DELIVERY_H, title: 'พนักงานกำลังนำส่ง', location: dest, kind: 'out' },
  ];

  const events: TrackingEvent[] = [];
  const endH = status === 'done' && shipment.deliveredAt ? (new Date(shipment.deliveredAt).getTime() - t0) / H : status === 'returned' && shipment.returnedAt ? (new Date(shipment.returnedAt).getTime() - t0) / H : Number.POSITIVE_INFINITY;
  for (const p of plan) {
    if (p.h > elapsedH || p.h > endH) break;
    events.push({ at: at(p.h), ...p });
  }
  if (status === 'done' && shipment.deliveredAt) events.push({ at: shipment.deliveredAt, title: 'จัดส่งสำเร็จ ผู้รับเซ็นรับแล้ว', location: dest, kind: 'delivered' });
  if (status === 'returned' && shipment.returnedAt) events.push({ at: shipment.returnedAt, title: `พัสดุตีกลับ${shipment.returnReason ? ` — ${shipment.returnReason}` : ''}`, location: dest, kind: 'returned' });
  return events.reverse();
}

/** ออเดอร์ที่ส่งไปนานพอ (mock) ให้ถือว่าถึงมือลูกค้า — ใช้กับปุ่ม "ซิงก์สถานะพัสดุ" */
export function isMockDelivered(order: Order, now: Date): boolean {
  if (order.status !== 'shipped' || !order.shipment) return false;
  return now.getTime() - new Date(order.shipment.shippedAt).getTime() >= MOCK_DELIVERED_H * H;
}

/** เดาจังหวัดปลายทางจากที่อยู่ (แค่ให้ไทม์ไลน์ดูสมจริง) */
export function guessProvince(address: string): string {
  const m = address.match(/(?:จ\.|จังหวัด)\s*([ก-๙]+)/) ?? address.match(/(กรุงเทพ[ฯ]?|เชียงใหม่|ขอนแก่น|สงขลา|ระยอง|สระบุรี|นครศรีธรรมราช|สมุทรปราการ|นนทบุรี|ปทุมธานี|ชลบุรี|ภูเก็ต|อุดรธานี|นครราชสีมา|พิษณุโลก)/);
  return m?.[1] ?? '';
}
