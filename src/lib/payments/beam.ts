import type { PaymentChannel, PaymentSettings } from '@/lib/types';

/**
 * Beam (beamcheckout.com) — mock ของช่องทางที่ Beam รับชำระ + ค่าธรรมเนียม "ตัวอย่าง"
 * ⚠️ ตัวเลขค่าธรรมเนียม/รายชื่อธนาคาร/เงื่อนไขผ่อน เป็นค่าประกอบภาพ ต้องตรวจกับสัญญาและเอกสาร Beam จริงตอนเชื่อมต่อ
 * pure module — ใช้ทั้ง server/client
 */
export type BeamChannelId = Exclude<PaymentChannel, 'cod'>;

export interface BeamChannel {
  id: BeamChannelId;
  name: string;
  group: 'qr' | 'card' | 'bank' | 'wallet' | 'intl' | 'credit';
  desc: string;
  /** ค่าธรรมเนียม % ของยอด (ตัวอย่าง) */
  feePct: number;
  /** ค่าธรรมเนียมคงที่ต่อรายการ (สตางค์) */
  feeFixed: number;
  /** ยอดขั้นต่ำ (สตางค์) · เช่น ผ่อนต้อง ≥ 3,000 */
  minAmount: number;
  /** ตัวเลือกย่อย: แบรนด์บัตร / ธนาคาร / จำนวนงวด */
  options?: string[];
  terms?: number[];
  /** เงินเข้าบัญชีร้าน (วันทำการ) */
  settlement: string;
}

export const BEAM_CHANNELS: BeamChannel[] = [
  { id: 'promptpay', name: 'PromptPay QR', group: 'qr', desc: 'สแกนจ่ายด้วยแอปธนาคารทุกธนาคาร', feePct: 0.99, feeFixed: 0, minAmount: 100, settlement: 'T+1' },
  { id: 'card', name: 'บัตรเครดิต/เดบิต', group: 'card', desc: 'Visa · Mastercard · JCB · UnionPay (3-D Secure)', feePct: 2.65, feeFixed: 0, minAmount: 100, options: ['Visa', 'Mastercard', 'JCB', 'UnionPay'], settlement: 'T+2' },
  { id: 'mobile_banking', name: 'Mobile Banking', group: 'bank', desc: 'เด้งไปแอปธนาคารเพื่อยืนยัน', feePct: 1.5, feeFixed: 0, minAmount: 100, options: ['KBank (K PLUS)', 'SCB Easy', 'Bangkok Bank', 'Krungsri', 'Krungthai NEXT', 'ttb touch', 'GSB MyMo'], settlement: 'T+1' },
  { id: 'truemoney', name: 'TrueMoney Wallet', group: 'wallet', desc: 'ตัดยอดจากกระเป๋า TrueMoney', feePct: 2.0, feeFixed: 0, minAmount: 100, settlement: 'T+1' },
  { id: 'shopeepay', name: 'ShopeePay', group: 'wallet', desc: 'ยืนยันในแอป Shopee', feePct: 2.0, feeFixed: 0, minAmount: 100, settlement: 'T+1' },
  { id: 'linepay', name: 'LINE Pay', group: 'wallet', desc: 'ยืนยันในแอป LINE', feePct: 2.5, feeFixed: 0, minAmount: 100, settlement: 'T+1' },
  { id: 'alipay', name: 'Alipay', group: 'intl', desc: 'สำหรับลูกค้าจีน — ชำระเป็นบาท', feePct: 2.9, feeFixed: 0, minAmount: 100, settlement: 'T+2' },
  { id: 'wechatpay', name: 'WeChat Pay', group: 'intl', desc: 'สำหรับลูกค้าจีน — ชำระเป็นบาท', feePct: 2.9, feeFixed: 0, minAmount: 100, settlement: 'T+2' },
  { id: 'installment', name: 'ผ่อนชำระ 0%', group: 'credit', desc: 'บัตรเครดิตธนาคารที่ร่วมรายการ ยอดขั้นต่ำ 3,000 บาท', feePct: 3.5, feeFixed: 0, minAmount: 300000, terms: [3, 6, 10], options: ['KBank', 'SCB', 'Krungsri', 'KTC', 'Citi/UOB'], settlement: 'T+2' },
  { id: 'bnpl', name: 'ซื้อก่อนจ่ายทีหลัง', group: 'credit', desc: 'แบ่งจ่าย 3 งวดไม่มีดอกเบี้ย (เช่น Atome)', feePct: 5.0, feeFixed: 0, minAmount: 30000, terms: [3], settlement: 'T+2' },
];

export const BEAM_GROUP_LABEL: Record<BeamChannel['group'], string> = {
  qr: 'QR Code',
  card: 'บัตร',
  bank: 'ธนาคาร',
  wallet: 'E-Wallet',
  intl: 'ต่างประเทศ',
  credit: 'ผ่อน / จ่ายทีหลัง',
};

/** ความสามารถของ Beam ที่ระบบนี้จำลองไว้ — ใช้โชว์ในหน้าตั้งค่า ให้เห็นภาพว่าต่อจริงแล้วทำอะไรได้ */
export const BEAM_FEATURES: { title: string; desc: string; mocked: boolean }[] = [
  { title: 'Hosted Checkout', desc: 'หน้าเลือกช่องทางชำระของ Beam — ร้านไม่ต้องแตะข้อมูลบัตร (PCI ของ Beam)', mocked: true },
  { title: 'Payment Links', desc: 'สร้างลิงก์/QR รับเงินส่งให้ลูกค้าทาง LINE โดยไม่ต้องมีออเดอร์ในระบบ', mocked: false },
  { title: 'Webhook', desc: 'Beam ยิงแจ้งผลชำระ (succeeded / failed / expired / refunded) มาที่ร้านแบบ real-time', mocked: true },
  { title: 'Refund', desc: 'คืนเงินเต็มจำนวนหรือบางส่วนจากหลังบ้าน เงินกลับช่องทางเดิมของลูกค้า', mocked: true },
  { title: 'Beam Pay (one-click)', desc: 'ลูกค้าที่เคยจ่ายกับร้านในเครือข่าย Beam กรอกครั้งเดียว ครั้งต่อไปกดจ่ายได้เลย', mocked: false },
  { title: 'Settlement & Report', desc: 'สรุปยอดโอนเข้าบัญชีร้านรายวัน แยกค่าธรรมเนียม ดาวน์โหลด CSV ทำบัญชี', mocked: true },
  { title: 'Sandbox', desc: 'โหมดทดสอบ — ยิงรายการ/ยืนยันผลได้โดยไม่ตัดเงินจริง', mocked: true },
];

export const beamChannel = (id: BeamChannelId): BeamChannel => BEAM_CHANNELS.find((c) => c.id === id) ?? BEAM_CHANNELS[0];
export const isBeamChannelId = (v: unknown): v is BeamChannelId => BEAM_CHANNELS.some((c) => c.id === v);

/** ค่าธรรมเนียม (สตางค์) ปัดเป็นจำนวนเต็ม */
export function beamFee(channel: BeamChannelId, amount: number): number {
  const c = beamChannel(channel);
  return Math.round((amount * c.feePct) / 100 + c.feeFixed);
}

/** ช่องทางที่เปิดใช้และยอดถึงขั้นต่ำ — ใช้ทั้งหน้า Beam (mock) และหน้า checkout */
export function availableChannels(settings: PaymentSettings, amount: number): BeamChannel[] {
  return BEAM_CHANNELS.filter((c) => settings.beam.channels[c.id] !== false && amount >= c.minAmount);
}

/** เลขอ้างอิงแบบ Beam (mock) */
export function mockReference(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `bm_${h.toString(16).padStart(8, '0')}${seed.length.toString(36)}`;
}
