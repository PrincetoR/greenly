/**
 * สร้างข้อมูลสาธิตใหม่ทั้งหมด: data/*.json + รูป placeholder ใน public/uploads/seed/
 *   npm run seed
 * ระวัง: เขียนทับ orders/carts/products/promotions ที่มีอยู่ (ใช้เพื่อ reset demo)
 *
 * รันด้วย tsx จึง import โมดูลที่มี 'server-only' ไม่ได้ — เขียนไฟล์ตรง ๆ ที่นี่
 *
 * ค่าเริ่มต้นสร้างประวัติออเดอร์ย้อนหลัง 24 เดือนให้แดชบอร์ดมีสถิติดู · `--no-history` = orders ว่าง (e2e ใช้ เพราะเทสต์นับออเดอร์)
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../src/lib/auth/password';
import type { Category, Order, Product, Promotion, Settings, User } from '../src/lib/types';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const SEED_IMG = path.join(ROOT, 'public', 'uploads', 'seed');

const now = new Date();
const WITH_HISTORY = !process.argv.includes('--no-history');
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86_400_000);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-|-$/g, '');

/* ---------- categories ---------- */
const categorySeed = [
  { id: 'c-drinks', name: 'เครื่องดื่มสุขภาพ', emoji: '🥤', hue: 150 },
  { id: 'c-grains', name: 'ธัญพืชและถั่ว', emoji: '🌾', hue: 40 },
  { id: 'c-snacks', name: 'ขนมเพื่อสุขภาพ', emoji: '🍪', hue: 20 },
  { id: 'c-supplement', name: 'อาหารเสริม', emoji: '💊', hue: 200 },
  { id: 'c-kitchen', name: 'ของใช้ในครัว', emoji: '🍳', hue: 260 },
  { id: 'c-dried', name: 'ผลไม้อบแห้ง', emoji: '🍑', hue: 340 },
];

const categories: Category[] = categorySeed.map((c, i) => ({
  id: c.id,
  slug: slugify(c.name),
  name: c.name,
  sortOrder: (i + 1) * 10,
  active: true,
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

function demoOrders(): Order[] {
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
      const ageDays = -i;
      const status: Order['status'] = ageDays > 1 && rand() < 0.05 ? 'cancelled' : ageDays > 7 ? 'done' : ageDays > 2 ? 'shipped' : ageDays > 0 ? 'paid' : 'pending';
      const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      const seq = (perDay.get(ymd) ?? 0) + 1;
      perDay.set(ymd, seq);
      orders.push({
        id: `o-h${String(orders.length + 1).padStart(4, '0')}`,
        orderNo: `OD-${ymd}-${String(seq).padStart(4, '0')}`,
        status,
        guestIds: [],
        customer: { name, phone, email: '', address },
        lines,
        subtotal,
        discountTotal,
        shippingFee,
        total: net + shippingFee,
        couponCode,
        promotionUsages: usages,
        paymentMethod: rand() < 0.6 ? 'transfer' : 'cod',
        note: '',
        createdAt: iso(createdAt),
        updatedAt: iso(createdAt),
      });
    }
  }
  return orders;
}

/* ---------- settings ---------- */
const settings: Settings = {
  storeName: 'Greenly',
  tagline: 'อาหารสุขภาพ ส่งตรงถึงบ้าน',
  shippingFee: 5000,
  freeShippingMin: 100000,
  lowStockThreshold: 5,
  contact: { phone: '02-000-0000', email: 'hello@greenly.example', line: '@greenly' },
  dashboard: { topCategories: 10, topProducts: 10 },
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
  const orders: Order[] = WITH_HISTORY ? demoOrders() : [];

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
    write('carts', {}),
    write('wishlists', {}),
    write('users', users),
    write('settings', settings),
    ...products.map((p) => {
      const cat = categorySeed.find((c) => c.id === p.categoryId)!;
      return writeFile(path.join(SEED_IMG, `${p.id}.svg`), placeholderSvg(p.name, cat.emoji, cat.hue));
    }),
  ]);

  console.log(
    `seeded: ${categories.length} categories · ${products.length} products · ${promotions.length} promotions · ${orders.length} orders · ${users.length} users (admin/admin1234, staff/staff1234)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
