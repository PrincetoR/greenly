import type { CarrierId } from '@/lib/types';

/**
 * ขนส่งที่รองรับ — pure module ใช้ทั้ง server/client
 * trackUrl = หน้าติดตามพัสดุของขนส่งจริง (ลูกค้ากดไปดูได้) · เลขพัสดุใน mock สร้างตาม pattern ของแต่ละเจ้า
 */
export interface Carrier {
  id: CarrierId;
  name: string;
  short: string;
  trackUrl: (trackingNo: string) => string;
  /** สร้างเลขพัสดุตัวอย่างสำหรับ seed/mock */
  sampleTracking: (n: number) => string;
  /** ระยะเวลาส่งโดยประมาณ (วัน) — แสดงให้ลูกค้า */
  etaDays: [number, number];
}

const pad = (n: number, len: number) => String(n).padStart(len, '0');

export const CARRIERS: Carrier[] = [
  { id: 'kerry', name: 'Kerry Express', short: 'Kerry', trackUrl: (n) => `https://th.kerryexpress.com/th/track/?track=${n}`, sampleTracking: (n) => `KEX${pad(n, 10)}`, etaDays: [1, 2] },
  { id: 'flash', name: 'Flash Express', short: 'Flash', trackUrl: (n) => `https://www.flashexpress.com/fle/tracking?se=${n}`, sampleTracking: (n) => `TH${pad(n, 13)}`, etaDays: [1, 3] },
  { id: 'jt', name: 'J&T Express', short: 'J&T', trackUrl: (n) => `https://www.jtexpress.co.th/index/query/gzquery.html?bills=${n}`, sampleTracking: (n) => `${pad(n, 12)}`, etaDays: [1, 3] },
  { id: 'thaipost', name: 'ไปรษณีย์ไทย (EMS)', short: 'EMS', trackUrl: (n) => `https://track.thailandpost.co.th/?trackNumber=${n}`, sampleTracking: (n) => `E${pad(n, 9)}TH`, etaDays: [1, 3] },
  { id: 'spx', name: 'SPX Express', short: 'SPX', trackUrl: (n) => `https://spx.co.th/track?sls_tracking_number=${n}`, sampleTracking: (n) => `SPXTH${pad(n, 12)}`, etaDays: [1, 3] },
  { id: 'ninja', name: 'Ninja Van', short: 'Ninja', trackUrl: (n) => `https://www.ninjavan.co/th-th/tracking?id=${n}`, sampleTracking: (n) => `NVTH${pad(n, 10)}`, etaDays: [2, 4] },
  { id: 'best', name: 'BEST Express', short: 'BEST', trackUrl: (n) => `https://www.best-inc.co.th/track?bills=${n}`, sampleTracking: (n) => `${pad(n, 13)}`, etaDays: [2, 4] },
  { id: 'dhl', name: 'DHL eCommerce', short: 'DHL', trackUrl: (n) => `https://www.dhl.com/th-th/home/tracking.html?tracking-id=${n}`, sampleTracking: (n) => `TH${pad(n, 12)}X`, etaDays: [2, 5] },
];

export const carrierById = (id: CarrierId): Carrier => CARRIERS.find((c) => c.id === id) ?? CARRIERS[0];
export const isCarrierId = (v: unknown): v is CarrierId => CARRIERS.some((c) => c.id === v);
