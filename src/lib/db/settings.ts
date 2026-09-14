import 'server-only';
import type { Settings } from '@/lib/types';
import { readDocument, updateDocument } from './store';

const NAME = 'settings';

export const DEFAULT_SETTINGS: Settings = {
  storeName: 'ร้านของเรา',
  tagline: 'สินค้าคุณภาพ ส่งตรงถึงบ้าน',
  shippingFee: 5000,
  freeShippingMin: null,
  lowStockThreshold: 5,
  contact: { phone: '', email: '', line: '' },
  dashboard: { topPromotions: 5, topCategories: 5, topProducts: 5 },
  payments: {
    beam: { enabled: true, mode: 'sandbox', merchantId: '', publicKey: '', secretKeyLast4: '', channels: {}, expiryMinutes: 15 },
    cod: { enabled: true, fee: 0 },
  },
  shipping: { senderName: '', senderPhone: '', senderAddress: '', carriers: ['kerry', 'flash', 'jt', 'thaipost'], defaultCarrier: 'kerry' },
};

export async function getSettings(): Promise<Settings> {
  const stored = await readDocument<Partial<Settings>>(NAME, {});
  // ผสานกับ default เผื่อไฟล์เก่าขาด field ที่เพิ่มมาทีหลัง
  return merge(stored);
}

/** ผสาน default ↔ ไฟล์ ↔ patch ทีละชั้น (object ซ้อนต้องผสานแยก ไม่งั้น field ใหม่หาย) */
function merge(...layers: Partial<Settings>[]): Settings {
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...Object.assign({}, ...layers),
    contact: Object.assign({}, d.contact, ...layers.map((l) => l.contact)),
    dashboard: Object.assign({}, d.dashboard, ...layers.map((l) => l.dashboard)),
    payments: {
      beam: Object.assign({}, d.payments.beam, ...layers.map((l) => l.payments?.beam), { channels: Object.assign({}, d.payments.beam.channels, ...layers.map((l) => l.payments?.beam?.channels)) }),
      cod: Object.assign({}, d.payments.cod, ...layers.map((l) => l.payments?.cod)),
    },
    shipping: Object.assign({}, d.shipping, ...layers.map((l) => l.shipping)),
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return updateDocument<Settings>(NAME, DEFAULT_SETTINGS, (doc) => merge(doc, patch));
}
