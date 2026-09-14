/**
 * สร้างข้อมูลสาธิตใหม่ทั้งหมด: data/*.json + รูป placeholder ใน public/uploads/seed/
 *   npm run seed
 * ระวัง: เขียนทับ orders/payments/carts/products/promotions ที่มีอยู่ (ใช้เพื่อ reset demo)
 *
 * รันด้วย tsx จึง import โมดูลที่มี 'server-only' ไม่ได้ — เขียนไฟล์ตรง ๆ ที่นี่
 *
 * ค่าเริ่มต้นสร้างประวัติออเดอร์ย้อนหลัง 24 เดือนให้แดชบอร์ดมีสถิติดู · `--no-history` = orders ว่าง (e2e ใช้ เพราะเทสต์นับออเดอร์)
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../src/lib/auth/password';
import type { Category, Homepage, Order, Payment, Product, Promotion, Settings, User } from '../src/lib/types';
import { CARRIERS } from '../src/lib/shipping/carriers';
import { beamFee, mockReference, type BeamChannelId } from '../src/lib/payments/beam';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const SEED_IMG = path.join(ROOT, 'public', 'uploads', 'seed');

const now = new Date();
const WITH_HISTORY = !process.argv.includes('--no-history');
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86_400_000);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '');

/* ---------- categories ---------- */
// icon = ไอคอน lucide บนการ์ดหน้าแรก · withImage = สร้างรูป placeholder ให้ (โชว์ว่าหมวดใส่รูปแทนไอคอนได้)
const categorySeed: { id: string; name: string; emoji: string; hue: number; icon: Category['icon']; withImage?: boolean }[] = [
  { id: 'c-drinks', name: 'เครื่องดื่มสุขภาพ', emoji: '🥤', hue: 150, icon: 'cup-soda', withImage: true },
  { id: 'c-grains', name: 'ธัญพืชและถั่ว', emoji: '🌾', hue: 40, icon: 'wheat' },
  { id: 'c-snacks', name: 'ขนมเพื่อสุขภาพ', emoji: '🍪', hue: 20, icon: 'cookie', withImage: true },
  { id: 'c-supplement', name: 'อาหารเสริม', emoji: '💊', hue: 200, icon: 'pill' },
  { id: 'c-kitchen', name: 'ของใช้ในครัว', emoji: '🍳', hue: 260, icon: 'cooking-pot' },
  { id: 'c-dried', name: 'ผลไม้อบแห้ง', emoji: '🍑', hue: 340, icon: 'cherry' },
];

const categories: Category[] = categorySeed.map((c, i) => ({
  id: c.id,
  slug: slugify(c.name),
  name: c.name,
  sortOrder: (i + 1) * 10,
  active: true,
  image: c.withImage ? `/uploads/seed/${c.id}.svg` : null,
  icon: c.icon,
}));

/* ---------- products ---------- */
type Seed = [name: string, baht: number, stock: number, desc: string, featured?: boolean];
const productSeed: Record<string, Seed[]> = {
  'c-drinks': [
    ['น้ำผักผลไม้สกัดเย็น 250 มล.', 89, 120, 'สกัดเย็นวันต่อวัน ไม่ใส่น้ำตาล ไม่ผ่านความร้อน คงคุณค่าวิตามินครบถ้วน', true],
    ['ชาเขียวมัทฉะออร์แกนิก 100 กรัม', 350, 40, 'มัทฉะเกรดพิธีชงชาจากอุจิ บดละเอียด สีเขียวสด กลิ่นหอมนุ่ม'],
    ['คอมบูชารสขิงมะนาว 330 มล.', 95, 80, 'เครื่องดื่มหมักชาธรรมชาติ มีโพรไบโอติกส์ ซ่าเบา ๆ สดชื่น', true],
    ['นมอัลมอนด์ไม่หวาน 1 ลิตร', 129, 60, 'อัลมอนด์แท้ 8% ไม่เติมน้ำตาล เหมาะกับคนแพ้แลคโตส'],
  ],
  'c-grains': [
    ['ข้าวโอ๊ตโรลด์ 1 กก.', 159, 90, 'โอ๊ตเต็มเมล็ดจากออสเตรเลีย ใยอาหารสูง ต้มหรือแช่ค้างคืนก็ได้', true],
    ['เมล็ดเจีย 500 กรัม', 220, 55, 'โอเมก้า 3 สูง เพิ่มความอิ่ม ใส่ในโยเกิร์ตหรือสมูทตี้'],
    ['อัลมอนด์อบธรรมชาติ 500 กรัม', 289, 70, 'อบแห้งไม่ใส่เกลือ ไม่ใส่น้ำมัน กรอบทุกเม็ด'],
    ['ควินัว 3 สี 500 กรัม', 245, 45, 'โปรตีนครบ 9 ชนิด ปราศจากกลูเตน หุงง่ายใน 15 นาที'],
  ],
  'c-snacks': [
    ['กราโนล่าน้ำผึ้งอัลมอนด์ 300 กรัม', 189, 100, 'อบกรอบด้วยน้ำผึ้งแท้ ไม่ใส่น้ำตาลทราย กินกับนมหรือโยเกิร์ต', true],
    ['สาหร่ายอบกรอบรสดั้งเดิม 6 ซอง', 99, 150, 'สาหร่ายเกาหลีอบด้วยน้ำมันมะกอก โซเดียมต่ำ'],
    ['โปรตีนบาร์ช็อกโกแลต 12 แท่ง', 420, 35, 'โปรตีน 20 กรัมต่อแท่ง น้ำตาลต่ำ อิ่มนานเหมาะหลังออกกำลังกาย'],
    ['ถั่วลูกไก่อบกรอบ 150 กรัม', 79, 130, 'อบไม่ทอด โปรตีนและใยอาหารสูง กินเล่นแทนขนมกรุบกรอบ'],
  ],
  'c-supplement': [
    ['วิตามินซี 1000 มก. 60 เม็ด', 390, 50, 'เสริมภูมิคุ้มกัน ดูดซึมดี ทานวันละ 1 เม็ดหลังอาหาร'],
    ['โพรไบโอติกส์ 10 สายพันธุ์ 30 แคปซูล', 690, 30, 'จุลินทรีย์ดี 10,000 ล้าน CFU ดูแลระบบย่อยและลำไส้', true],
    ['น้ำมันปลาโอเมก้า 3 90 แคปซูล', 850, 25, 'EPA/DHA เข้มข้น จากปลาน้ำลึกนอร์เวย์ ไม่มีกลิ่นคาว'],
    ['คอลลาเจนเปปไทด์ 200 กรัม', 590, 40, 'ละลายง่ายในน้ำเย็น ไม่มีกลิ่น ไม่มีรส 5,000 มก. ต่อช้อน'],
  ],
  'c-kitchen': [
    ['ขวดแก้วสมูทตี้พร้อมฝา 500 มล.', 149, 60, 'แก้วบอโรซิลิเกตทนร้อน-เย็น ฝาไม้ไผ่พร้อมหลอดสแตนเลส'],
    ['เครื่องชั่งอาหารดิจิทัล', 359, 20, 'ละเอียด 1 กรัม สูงสุด 5 กก. หน้าจอ LED ถอดล้างได้', true],
    ['กล่องถนอมอาหารแก้ว 3 ชิ้น', 490, 30, 'ฝาซิลิโคนล็อค 4 ด้าน เข้าไมโครเวฟและเตาอบได้'],
    ['หลอดสแตนเลสพร้อมแปรง 4 ชิ้น', 89, 200, 'ใช้ซ้ำได้ ลดขยะพลาสติก มาพร้อมถุงผ้าพกพา'],
  ],
  'c-dried': [
    ['มะม่วงอบแห้งไม่ใส่น้ำตาล 200 กรัม', 145, 80, 'มะม่วงน้ำดอกไม้สุกอบลมร้อน หวานธรรมชาติ ไม่เติมน้ำตาล', true],
    ['แครนเบอร์รี่อบแห้ง 250 กรัม', 165, 65, 'เปรี้ยวอมหวาน แหล่งสารต้านอนุมูลอิสระ ใส่สลัดหรือกราโนล่า'],
    ['กล้วยหอมอบกรอบ 100 กรัม', 59, 120, 'อบกรอบไม่ทอด ไม่ใส่น้ำมัน หวานจากผลไม้ล้วน'],
    ['ผลไม้รวมอบแห้ง 5 ชนิด 300 กรัม', 199, 50, 'มะม่วง สับปะรด มะละกอ แก้วมังกร กีวี ไม่ใส่สารกันบูด'],
  ],
};

const products: Product[] = [];
let sku = 1;
for (const [categoryId, seeds] of Object.entries(productSeed)) {
  for (const [name, baht, stock, description, featured] of seeds) {
    const id = `p-${String(sku).padStart(3, '0')}`;
    // สินค้าที่สร้างก่อนมี createdAt เก่ากว่า เพื่อให้ "สินค้าใหม่" เรียงได้จริง · ทุกตัวเก่ากว่าประวัติออเดอร์ (24 เดือน)
    const createdAt = iso(daysFromNow(-(760 - sku * 4)));
    products.push({
      id,
      sku: `SKU-${String(sku).padStart(4, '0')}`,
      slug: `${slugify(name)}-${id}`,
      name,
      description,
      categoryId,
      price: baht * 100,
      stock,
      images: [`/uploads/seed/${id}.svg`],
      active: true,
      featured: Boolean(featured),
      createdAt,
      updatedAt: createdAt,
    });
    sku += 1;
  }
}

/* ---------- placeholder images ---------- */
function placeholderSvg(name: string, emoji: string, hue: number): string {
  const short = name.length > 22 ? `${name.slice(0, 22)}…` : name;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 55% 92%)"/>
      <stop offset="1" stop-color="hsl(${hue} 45% 78%)"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="340" r="190" fill="hsl(${hue} 50% 97% / .7)"/>
  <text x="400" y="400" font-size="220" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="400" y="650" font-size="40" font-family="system-ui, sans-serif" font-weight="600"
        fill="hsl(${hue} 35% 25%)" text-anchor="middle">${short}</text>
</svg>
`;
}

/* ---------- promotions (สัมพันธ์กับวันที่รัน seed) ---------- */
const basePromo = { createdAt: iso(now), updatedAt: iso(now) };
const promotions: Promotion[] = [
  {
    id: 'promo-drinks20',
    name: 'ลด 20% เครื่องดื่มสุขภาพ',
    type: 'discount',
    active: true,
    startsAt: iso(daysFromNow(-1)),
    endsAt: iso(daysFromNow(14)),
    scope: { kind: 'categories', ids: ['c-drinks'] },
    discount: { mode: 'percent', value: 20 },
    coupon: null,
    bogo: null,
    limits: { totalUses: null, perProductQty: 5, perCustomer: null },
    ...basePromo,
  },
  {
    id: 'promo-save100',
    name: 'คูปอง SAVE100 ลดทันที 100 บาท',
    type: 'coupon',
    active: true,
    startsAt: iso(daysFromNow(-1)),
    endsAt: iso(daysFromNow(30)),
    scope: { kind: 'all', ids: [] },
    discount: { mode: 'fixed', value: 10000 },
    coupon: { code: 'SAVE100', minSubtotal: 50000, freeShipping: false },
    bogo: null,
    limits: { totalUses: 50, perProductQty: null, perCustomer: 1 },
    ...basePromo,
  },
  {
    id: 'promo-snack-b2g1',
    name: 'ขนมสุขภาพ ซื้อ 2 แถม 1',
    type: 'bogo',
    active: true,
    startsAt: iso(daysFromNow(-1)),
    endsAt: iso(daysFromNow(7)),
    scope: { kind: 'categories', ids: ['c-snacks'] },
    discount: null,
    coupon: null,
    bogo: { buyQty: 2, getQty: 1 },
    limits: { totalUses: null, perProductQty: null, perCustomer: 1 },
    ...basePromo,
  },
  {
    id: 'promo-upcoming',
    name: 'Flash Sale อาหารเสริม ลด 150 บาท',
    type: 'discount',
    active: true,
    startsAt: iso(daysFromNow(3)),
    endsAt: iso(daysFromNow(5)),
    scope: { kind: 'categories', ids: ['c-supplement'] },
    discount: { mode: 'fixed', value: 15000 },
    coupon: null,
    bogo: null,
    limits: { totalUses: 20, perProductQty: 2, perCustomer: 1 },
    ...basePromo,
  },
  {
    id: 'promo-expired',
    name: 'ลด 10% ทั้งร้าน กลางเดือน',
    type: 'discount',
    active: true,
    startsAt: iso(daysFromNow(-30)),
    endsAt: iso(daysFromNow(-10)),
    scope: { kind: 'all', ids: [] },
    discount: { mode: 'percent', value: 10 },
    coupon: null,
    bogo: null,
    limits: { totalUses: null, perProductQty: null, perCustomer: null },
    ...basePromo,
  },
  // โปรในอดีต 2 ตัว — ประวัติออเดอร์อ้างถึง ให้แดชบอร์ดเทียบ "ก่อน/ระหว่างโปร" ได้
  {
    id: 'promo-past-coupon',
    name: 'คูปอง SUMMER50 ลด 50 บาท',
    type: 'coupon',
    active: true,
    startsAt: iso(daysFromNow(-150)),
    endsAt: iso(daysFromNow(-120)),
    scope: { kind: 'all', ids: [] },
    discount: { mode: 'fixed', value: 5000 },
    coupon: { code: 'SUMMER50', minSubtotal: 30000, freeShipping: false },
    bogo: null,
    limits: { totalUses: null, perProductQty: null, perCustomer: null },
    ...basePromo,
  },
  {
    id: 'promo-past-anniv',
    name: 'ครบรอบร้าน ลด 15% ธัญพืชและขนม',
    type: 'discount',
    active: true,
    startsAt: iso(daysFromNow(-275)),
    endsAt: iso(daysFromNow(-255)),
    scope: { kind: 'categories', ids: ['c-grains', 'c-snacks'] },
    discount: { mode: 'percent', value: 15 },
    coupon: null,
    bogo: null,
    limits: { totalUses: null, perProductQty: null, perCustomer: null },
    ...basePromo,
  },
];

/* ---------- ประวัติออเดอร์สาธิต 24 เดือน (deterministic — RNG seed คงที่ รันกี่ครั้งก็ได้ชุดเดิมเมื่อ now เท่ากัน) ---------- */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const customers = [
  ['สมชาย ใจดี', '0812345678', '12/3 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'],
  ['วราภรณ์ ศรีสุข', '0898765432', '99 หมู่ 4 ต.บางพลี อ.บางพลี สมุทรปราการ 10540'],
  ['ณัฐพล พงษ์พานิช', '0861112222', '45 ซ.ลาดพร้าว 71 เขตวังทองหลาง กรุงเทพฯ 10310'],
  ['พิมพ์ชนก ทองดี', '0923334444', '7/1 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง เชียงใหม่ 50200'],
  ['อรุณ แสงทอง', '0845556666', '210 ถ.มิตรภาพ ต.ในเมือง อ.เมือง ขอนแก่น 40000'],
  ['กมลวรรณ บุญมา', '0957778888', '88 ถ.ราชดำเนิน ต.ในเมือง อ.เมือง นครศรีธรรมราช 80000'],
  ['ธีรภัทร วงศ์สวัสดิ์', '0639990000', '15 ซ.รามคำแหง 24 เขตหัวหมาก กรุงเทพฯ 10240'],
  ['ศิริพร มั่นคง', '0871234567', '3/5 ถ.เพชรเกษม ต.หาดใหญ่ อ.หาดใหญ่ สงขลา 90110'],
  ['ปิยะ รักษ์ดี', '0819876543', '120 ถ.ศรีนครินทร์ เขตประเวศ กรุงเทพฯ 10250'],
  ['จิราพร แก้วใส', '0902468135', '56 หมู่ 2 ต.บ้านฉาง อ.บ้านฉาง ระยอง 21130'],
  ['วีระ ชัยชนะ', '0881357924', '9 ถ.พหลโยธิน ต.ปากเพรียว อ.เมือง สระบุรี 18000'],
  ['นภัสสร อินทร์แก้ว', '0651122334', '31 ซ.สุขุมวิท 101 เขตพระโขนง กรุงเทพฯ 10260'],
] as const;

/** น้ำหนักต่อหมวด — ให้หมวดเครื่องดื่ม/ขนมขายดี ของใช้ในครัวขายน้อย แดชบอร์ดจะได้เห็นความต่าง */
const categoryWeight: Record<string, number> = { 'c-drinks': 0.3, 'c-snacks': 0.22, 'c-grains': 0.18, 'c-dried': 0.12, 'c-supplement': 0.1, 'c-kitchen': 0.08 };

/** ช่องทาง Beam ที่ลูกค้าสาธิตเลือก (น้ำหนักตามความนิยมในไทย) */
const beamChannelWeight: [BeamChannelId, number][] = [
  ['promptpay', 0.5],
  ['card', 0.2],
  ['mobile_banking', 0.14],
  ['truemoney', 0.07],
  ['shopeepay', 0.04],
  ['linepay', 0.03],
  ['installment', 0.02],
];
const RETURN_REASONS = ['ไม่มีผู้รับ ติดต่อไม่ได้', 'ที่อยู่ไม่ชัดเจน', 'ผู้รับปฏิเสธรับสินค้า', 'กล่องเสียหายระหว่างขนส่ง'];
const BOX_SIZES = ['A', 'B', 'C', 'D'];

/** ลำดับ [orders, payments] — payments เป็น ledger ฝั่ง Beam (mock) ที่อ้างถึงออเดอร์ */
function demoOrders(): { orders: Order[]; payments: Payment[] } {
  const payments: Payment[] = [];
  const rand = mulberry32(20260914);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const weightedProduct = () => {
    let r = rand();
    for (const [cid, w] of Object.entries(categoryWeight)) {
      if (r < w) return pick(products.filter((p) => p.categoryId === cid));
      r -= w;
    }
    return pick(products);
  };
  const past = promotions.filter((p) => new Date(p.startsAt) < now);
  const inScope = (p: Promotion, prod: Product) => p.scope.kind === 'all' || (p.scope.kind === 'categories' ? p.scope.ids.includes(prod.categoryId) : p.scope.ids.includes(prod.id));

  const orders: Order[] = [];
  const perDay = new Map<string, number>();
  const DAYS = 730;
  for (let i = -DAYS; i <= 0; i++) {
    const dayStart = daysFromNow(i);
    const progress = (i + DAYS) / DAYS;
    // ร้านโตขึ้นเรื่อย ๆ · เสาร์-อาทิตย์ขายดีกว่า · ช่วงมีโปรออเดอร์เพิ่ม (ให้ "ก่อน/ระหว่างโปร" ต่างกันจริง)
    let rate = 0.2 + 0.85 * progress;
    if ([0, 6].includes(dayStart.getDay())) rate *= 1.35;
    const livePromos = past.filter((p) => new Date(p.startsAt) <= dayStart && new Date(p.endsAt) > dayStart && p.id !== 'promo-drinks20' && p.id !== 'promo-save100' && p.id !== 'promo-snack-b2g1');
    if (livePromos.length) rate *= 1.6;
    let count = Math.floor(rate) + (rand() < rate % 1 ? 1 : 0) + (rand() < 0.12 ? 1 : 0);
    if (i === 0) count = Math.min(count, 2);

    for (let n = 0; n < count; n++) {
      const createdAt = new Date(dayStart.getTime());
      createdAt.setHours(8 + Math.floor(rand() * 14), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
      if (createdAt > now) createdAt.setTime(now.getTime() - 60_000 * (n + 1));
      const [name, phone, address] = pick(customers);
      const chosen = new Map<string, Product>();
      const lineCount = rand() < 0.5 ? 1 : rand() < 0.7 ? 2 : 3;
      while (chosen.size < lineCount) {
        const p = weightedProduct();
        chosen.set(p.id, p);
      }
      const promo = livePromos.length && rand() < 0.65 ? pick(livePromos) : null;
      const lines: Order['lines'] = [];
      const usages: Order['promotionUsages'] = [];
      let subtotal = 0;
      for (const p of chosen.values()) {
        const qty = rand() < 0.65 ? 1 : rand() < 0.7 ? 2 : 3;
        const full = p.price * qty;
        subtotal += full;
        let discount = 0;
        let promotionId: string | null = null;
        if (promo && promo.type === 'discount' && promo.discount && inScope(promo, p)) {
          discount = promo.discount.mode === 'percent' ? Math.round((full * promo.discount.value) / 100) : Math.min(full, promo.discount.value * qty);
          promotionId = promo.id;
          usages.push({ promotionId: promo.id, productId: p.id, qty });
        }
        lines.push({ productId: p.id, name: p.name, image: p.images[0] ?? null, unitPrice: p.price, qty, discount, promotionId, isGift: false });
      }
      let couponCode: string | null = null;
      let discountTotal = lines.reduce((s, l) => s + l.discount, 0);
      if (promo && promo.type === 'coupon' && promo.coupon && promo.discount && subtotal >= (promo.coupon.minSubtotal ?? 0)) {
        couponCode = promo.coupon.code;
        discountTotal += Math.min(subtotal - discountTotal, promo.discount.value);
        usages.push({ promotionId: promo.id, productId: null, qty: 1 });
      }
      const net = subtotal - discountTotal;
      const shippingFee = net >= settings.freeShippingMin! ? 0 : settings.shippingFee;
      const total = net + shippingFee;
      const ageDays = -i;
      const ageH = (now.getTime() - createdAt.getTime()) / 3_600_000;
      // วงจร: เก่า → ถึงมือลูกค้า · 2–4 วัน → ระหว่างจัดส่ง · 1–2 วัน → รอแพ็ค/กำลังแพ็ค · วันนี้ → รอชำระ/รอแพ็ค · ตีกลับ 2% ของที่ส่งแล้ว · ยกเลิก 5%
      let status: Order['status'];
      if (ageDays > 1 && rand() < 0.05) status = 'cancelled';
      else if (ageDays > 6) status = rand() < 0.02 ? 'returned' : 'done';
      else if (ageDays > 2) status = 'shipped';
      else if (ageDays > 0) status = rand() < 0.5 ? 'packing' : 'paid';
      else status = ageH > 6 ? 'paid' : 'pending';
      const paymentMethod: Order['paymentMethod'] = rand() < 0.7 ? 'beam' : 'cod';
      const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      const seq = (perDay.get(ymd) ?? 0) + 1;
      perDay.set(ymd, seq);
      const id = `o-h${String(orders.length + 1).padStart(4, '0')}`;
      const orderNo = `OD-${ymd}-${String(seq).padStart(4, '0')}`;
      const history: Order['history'] = [{ at: iso(createdAt), type: 'pending', by: 'customer', note: 'ลูกค้าสั่งซื้อ' }];
      const later = (h: number) => iso(new Date(Math.min(createdAt.getTime() + h * 3_600_000, now.getTime() - 1000)));

      // การชำระเงิน
      let payment: Order['payment'] = null;
      if (paymentMethod === 'beam') {
        let r = rand();
        let channel: BeamChannelId = 'promptpay';
        for (const [c, w] of beamChannelWeight) {
          if (r < w) {
            channel = c;
            break;
          }
          r -= w;
        }
        if (channel === 'installment' && total < 300000) channel = 'card';
        const fee = beamFee(channel, total);
        const paid = status !== 'pending';
        // ลองจ่ายไม่สำเร็จก่อน 4% (เห็นรายการ failed ใน ledger)
        if (rand() < 0.04) {
          payments.push({ id: `pay-h${String(payments.length + 1).padStart(4, '0')}`, orderId: id, orderNo, provider: 'beam', channel: 'card', amount: total, fee: 0, net: 0, status: 'failed', reference: mockReference(`${id}-fail`), installmentTerm: null, customer: { name, phone }, refunds: [], createdAt: later(0.05), updatedAt: later(0.1), paidAt: null, expiresAt: later(0.25) });
        }
        const refunded = status === 'cancelled' && paid;
        const pay: Payment = {
          id: `pay-h${String(payments.length + 1).padStart(4, '0')}`,
          orderId: id,
          orderNo,
          provider: 'beam',
          channel,
          amount: total,
          fee: paid ? fee : 0,
          net: paid ? total - fee : 0,
          status: refunded ? 'refunded' : paid ? 'succeeded' : 'pending',
          reference: paid ? mockReference(id) : null,
          installmentTerm: channel === 'installment' ? pick([3, 6, 10] as const) : null,
          customer: { name, phone },
          refunds: refunded ? [{ id: `rf-${id}`, amount: total, reason: 'ยกเลิกคำสั่งซื้อ', at: later(30), by: 'admin' }] : [],
          createdAt: later(0.1),
          updatedAt: later(0.2),
          paidAt: paid ? later(0.2) : null,
          expiresAt: later(0.35),
        };
        payments.push(pay);
        payment = { provider: 'beam', channel, paymentId: pay.id, status: pay.status, amount: total, fee: pay.fee, paidAt: pay.paidAt, refundedAmount: refunded ? total : 0 };
        if (paid) history.push({ at: pay.paidAt!, type: 'paid', by: 'system', note: `ชำระผ่าน Beam (${channel}) สำเร็จ · อ้างอิง ${pay.reference}` });
      } else {
        const collected = status === 'done';
        payment = { provider: 'cod', channel: 'cod', paymentId: null, status: collected ? 'succeeded' : status === 'cancelled' ? 'failed' : 'pending', amount: total, fee: 0, paidAt: null, refundedAmount: 0 };
        if (status !== 'pending') history.push({ at: later(2), type: 'paid', by: 'staff', note: 'ยืนยันรับออเดอร์ (เก็บเงินปลายทาง)' });
      }

      // การจัดส่ง
      let shipment: Order['shipment'] = null;
      if (['packing', 'shipped', 'done', 'returned'].includes(status)) history.push({ at: later(6), type: 'packing', by: 'staff', note: 'เริ่มแพ็คสินค้า' });
      if (['shipped', 'done', 'returned'].includes(status)) {
        const carrier = pick(CARRIERS.filter((c) => settings.shipping.carriers.includes(c.id)));
        const shippedAt = later(20);
        shipment = { carrier: carrier.id, trackingNo: carrier.sampleTracking(100000 + orders.length * 7), shippedAt, deliveredAt: null, returnedAt: null, returnReason: null, weightGrams: 300 + Math.floor(rand() * 1700), boxSize: pick(BOX_SIZES), note: '' };
        history.push({ at: shippedAt, type: 'shipped', by: 'staff', note: `ส่งกับ ${carrier.name} เลขพัสดุ ${shipment.trackingNo}` });
        if (status === 'done') {
          shipment.deliveredAt = later(20 + 30 + Math.floor(rand() * 30));
          history.push({ at: shipment.deliveredAt, type: 'done', by: 'system', note: 'ขนส่งยืนยันจัดส่งสำเร็จ' });
          if (payment.provider === 'cod') { payment.paidAt = shipment.deliveredAt; history.push({ at: shipment.deliveredAt, type: 'payment', by: 'system', note: 'เก็บเงินปลายทางแล้ว' }); }
        }
        if (status === 'returned') {
          shipment.returnedAt = later(20 + 60);
          shipment.returnReason = pick(RETURN_REASONS);
          history.push({ at: shipment.returnedAt, type: 'returned', by: 'staff', note: `พัสดุตีกลับ — ${shipment.returnReason}` });
        }
      }
      if (status === 'cancelled') history.push({ at: later(30), type: 'cancelled', by: 'admin', note: payment.provider === 'beam' && payment.status === 'refunded' ? 'ยกเลิกและคืนเงินผ่าน Beam แล้ว' : 'ลูกค้าขอยกเลิก' });

      orders.push({
        id,
        orderNo,
        status,
        guestIds: [],
        customer: { name, phone, email: '', address },
        lines,
        subtotal,
        discountTotal,
        shippingFee,
        total,
        couponCode,
        promotionUsages: usages,
        paymentMethod,
        payment,
        shipment,
        history,
        note: '',
        createdAt: iso(createdAt),
        updatedAt: history[history.length - 1]?.at ?? iso(createdAt),
      });
    }
  }
  return { orders, payments };
}

/* ---------- หน้าแรก: สไลด์ + ป๊อปอัป (รูปเป็น SVG placeholder แนวนอน) ---------- */
// withText = ฝังข้อความในรูป (ป๊อปอัป) · สไลด์ไม่ฝัง เพราะข้อความซ้อนบนรูปจากตั้งค่าอยู่แล้ว
function bannerSvg(title: string, sub: string, hue: number, emoji: string, withText = false, height = 800): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 ${height}" width="1600" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 60% 88%)"/>
      <stop offset="1" stop-color="hsl(${hue + 40} 55% 70%)"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="${height}" fill="url(#g)"/>
  <circle cx="1200" cy="${height / 2}" r="${Math.round(height * 0.36)}" fill="hsl(${hue} 60% 96% / .6)"/>
  <text x="1200" y="${height / 2 + 30}" font-size="${Math.round(height * 0.4)}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  ${withText ? `<text x="120" y="${height / 2 - 10}" font-size="72" font-family="system-ui, sans-serif" font-weight="700" fill="hsl(${hue} 40% 20%)">${title}</text>
  <text x="120" y="${height / 2 + 60}" font-size="36" font-family="system-ui, sans-serif" fill="hsl(${hue} 30% 30%)">${sub}</text>` : ''}
</svg>
`;
}

const bannerSeed: { id: string; file: string; title: string; subtitle: string; href: string; buttonLabel: string; hue: number; emoji: string; slot: 'main' | 'side' }[] = [
  { id: 'slide-promo', file: 'banner-promo', title: 'ลด 20% เครื่องดื่มสุขภาพ', subtitle: 'สกัดเย็น คอมบูชา มัทฉะ — โปรถึงสิ้นเดือนนี้', href: '/promotions', buttonLabel: 'ดูโปรโมชัน', hue: 150, emoji: '🥤', slot: 'main' },
  { id: 'slide-new', file: 'banner-new', title: 'สินค้าใหม่ประจำสัปดาห์', subtitle: 'กราโนล่า โปรตีนบาร์ ขนมสุขภาพ ส่งฟรีเมื่อครบ 1,000 บาท', href: '/products?sort=newest', buttonLabel: 'เลือกซื้อ', hue: 30, emoji: '🍪', slot: 'main' },
  { id: 'slide-brand', file: 'banner-brand', title: 'Greenly', subtitle: 'อาหารสุขภาพ ส่งตรงถึงบ้าน', href: '/products', buttonLabel: '', hue: 200, emoji: '🌿', slot: 'main' },
  // ภาพเล็กด้านขวา 2 ช่อง (แบบ Shopee)
  { id: 'side-freeship', file: 'banner-side-freeship', title: 'ส่งฟรีเมื่อครบ 1,000', subtitle: 'ทุกออเดอร์ ทั่วไทย', href: '/products', buttonLabel: '', hue: 100, emoji: '🚚', slot: 'side' },
  { id: 'side-coupon', file: 'banner-side-coupon', title: 'โค้ด SAVE100', subtitle: 'ลูกค้าใหม่ลดทันที 100 บาท', href: '/promotions', buttonLabel: '', hue: 340, emoji: '🎟️', slot: 'side' },
];

const homepage: Homepage = {
  slides: bannerSeed.map((b, i) => ({ id: b.id, image: `/uploads/seed/${b.file}.svg`, title: b.title, subtitle: b.subtitle, href: b.href, buttonLabel: b.buttonLabel, active: true, sortOrder: (i + 1) * 10, slot: b.slot })),
  autoplaySeconds: 5,
  // ป๊อปอัปเปิดเฉพาะ seed สาธิต — e2e (seed:clean) ปิดไว้ ไม่งั้นบังปุ่มที่เทสต์กด
  popup: {
    enabled: WITH_HISTORY,
    image: '/uploads/seed/popup-welcome.svg',
    title: 'ลูกค้าใหม่รับส่วนลด 100 บาท',
    body: 'ใส่โค้ด SAVE100 ที่หน้าตะกร้า เมื่อสั่งซื้อครบ 500 บาท · ใช้ได้ 1 ครั้งต่อลูกค้า',
    href: '/promotions',
    buttonLabel: 'ดูโปรโมชัน',
    width: 480,
    frequency: 'daily',
    version: iso(now),
  },
};

/* ---------- settings ---------- */
const settings: Settings = {
  storeName: 'Greenly',
  tagline: 'อาหารสุขภาพ ส่งตรงถึงบ้าน',
  shippingFee: 5000,
  freeShippingMin: 100000,
  lowStockThreshold: 5,
  contact: { phone: '02-000-0000', email: 'hello@greenly.example', line: '@greenly' },
  dashboard: { topPromotions: 5, topCategories: 5, topProducts: 5 },
  payments: {
    beam: {
      enabled: true,
      mode: 'sandbox',
      merchantId: 'mch_greenly_demo',
      publicKey: 'pk_test_greenly_1a2b3c4d5e6f',
      secretKeyLast4: '9f3e',
      channels: { promptpay: true, card: true, mobile_banking: true, truemoney: true, shopeepay: true, linepay: true, alipay: false, wechatpay: false, installment: true, bnpl: false },
      expiryMinutes: 15,
    },
    cod: { enabled: true, fee: 0 },
  },
  shipping: {
    senderName: 'Greenly',
    senderPhone: '02-000-0000',
    senderAddress: '99/9 อาคารกรีนลี่ ชั้น 2 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
    carriers: ['kerry', 'flash', 'jt', 'thaipost', 'spx'],
    defaultCarrier: 'kerry',
  },
};

async function main() {
  const users: User[] = [
    {
      id: 'u-admin',
      username: 'admin',
      passwordHash: await hashPassword('admin1234'),
      name: 'ผู้ดูแลระบบ',
      role: 'admin',
      active: true,
      createdAt: iso(daysFromNow(-60)),
    },
    {
      id: 'u-staff',
      username: 'staff',
      passwordHash: await hashPassword('staff1234'),
      name: 'พนักงานร้าน',
      role: 'staff',
      active: true,
      createdAt: iso(daysFromNow(-59)),
    },
  ];
  const { orders, payments } = WITH_HISTORY ? demoOrders() : { orders: [] as Order[], payments: [] as Payment[] };

  await mkdir(DATA, { recursive: true });
  await rm(SEED_IMG, { recursive: true, force: true });
  await mkdir(SEED_IMG, { recursive: true });

  const write = (name: string, value: unknown) =>
    writeFile(path.join(DATA, `${name}.json`), JSON.stringify(value, null, 2) + '\n');

  await Promise.all([
    write('categories', categories),
    write('products', products),
    write('promotions', promotions),
    write('orders', orders),
    write('payments', payments),
    write('homepage', homepage),
    write('carts', {}),
    write('wishlists', {}),
    write('users', users),
    write('settings', settings),
    ...products.map((p) => {
      const cat = categorySeed.find((c) => c.id === p.categoryId)!;
      return writeFile(path.join(SEED_IMG, `${p.id}.svg`), placeholderSvg(p.name, cat.emoji, cat.hue));
    }),
    ...categorySeed.filter((c) => c.withImage).map((c) => writeFile(path.join(SEED_IMG, `${c.id}.svg`), placeholderSvg(c.name, c.emoji, c.hue))),
    ...bannerSeed.map((b) => writeFile(path.join(SEED_IMG, `${b.file}.svg`), bannerSvg(b.title, b.subtitle, b.hue, b.emoji, false, 800))),
    writeFile(path.join(SEED_IMG, 'popup-welcome.svg'), bannerSvg('ส่วนลด 100 บาท', 'สำหรับลูกค้าใหม่', 340, '🎁', true, 600)),
  ]);

  console.log(
    `seeded: ${categories.length} categories · ${products.length} products · ${promotions.length} promotions · ${orders.length} orders · ${payments.length} payments · ${users.length} users (admin/admin1234, staff/staff1234)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
