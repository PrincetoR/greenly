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
  dashboard: { topCategories: 10, topProducts: 10 },
};

export async function getSettings(): Promise<Settings> {
  const stored = await readDocument<Partial<Settings>>(NAME, {});
  // ผสานกับ default เผื่อไฟล์เก่าขาด field ที่เพิ่มมาทีหลัง
  return { ...DEFAULT_SETTINGS, ...stored, contact: { ...DEFAULT_SETTINGS.contact, ...stored.contact }, dashboard: { ...DEFAULT_SETTINGS.dashboard, ...stored.dashboard } };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return updateDocument<Settings>(NAME, DEFAULT_SETTINGS, (doc) => ({
    ...DEFAULT_SETTINGS,
    ...doc,
    ...patch,
    contact: { ...DEFAULT_SETTINGS.contact, ...doc.contact, ...patch.contact },
    dashboard: { ...DEFAULT_SETTINGS.dashboard, ...doc.dashboard, ...patch.dashboard },
  }));
}
