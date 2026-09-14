const { BASE, launch, login, shot, ok, DATA, SHOT } = require('./lib');
const fs = require('fs');
const PROMOS = DATA + '/promotions.json';
const readPromos = () => JSON.parse(fs.readFileSync(PROMOS, 'utf8'));
const writePromos = (p) => fs.writeFileSync(PROMOS, JSON.stringify(p, null, 2) + '\n');

(async () => {
  const { browser, page } = await launch();

  // home promo strip
  await page.goto(`${BASE}/`);
  ok((await page.locator('h2:has-text("โปรโมชันตอนนี้")').count()) === 1, 'home: promo strip');
  ok((await page.locator('article').count()) === 4, 'home: 4 live promo cards (3 ต่อหน้า เลื่อนดูใบที่ 4)');
  ok(await page.locator('article', { hasText: 'SAVE100' }).first().isVisible() && (await page.locator('article code').count()) === 0, 'home: coupon code in summary sentence (ไม่มีกล่องใช้โค้ด)');
  // การ์ดย่อ: ชื่อ 1 บรรทัด (truncate) · สถานะใต้ชื่อ · คำอธิบาย 1 บรรทัด = ทำอะไร (ช่วงเวลา/เงื่อนไขเอาออก — พี่ต่อ: การ์ดแน่นไป) · กดแล้วเปิดป๊อปอัปรายละเอียดเต็ม
  const card = page.locator('article', { hasText: 'SAVE100' }).first();
  const nowrap = (el) => getComputedStyle(el).textOverflow === 'ellipsis' && getComputedStyle(el).whiteSpace === 'nowrap';
  const desc = card.locator(':scope > p');
  ok((await card.locator('h3').evaluate(nowrap)) && (await desc.count()) === 1 && (await desc.evaluate(nowrap)), 'card: ชื่อ 1 บรรทัด · คำอธิบาย 1 บรรทัดตัด …');
  ok((await card.locator('h3 + div').textContent()) === 'กำลังใช้งาน' && (await desc.textContent()) === 'โค้ด SAVE100 ลด ฿100 สินค้าทั้งร้าน เมื่อซื้อครบ ฿500' && !(await card.textContent()).includes('จำกัด 50 สิทธิ์'), 'card: สถานะใต้ชื่อ · คำอธิบายทำอะไร · ไม่มีช่วงเวลา/เงื่อนไขบนการ์ด');
  // ไอคอนการ์ด 52 ใหญ่กว่าบล็อกชื่อ+สถานะ (48) นิดหน่อย (พี่ต่อ: ไม่ให้ข้อความดูล้น) · คำอธิบายเต็มความกว้าง ชิดซ้ายเท่าไอคอน เหมือนป๊อปอัป
  const ic = await card.locator('h3').evaluate((h) => { const icon = h.parentElement.previousElementSibling.getBoundingClientRect(); const hr = h.getBoundingClientRect(); const pe = h.closest('article').querySelector(':scope > p'); const p = pe.getBoundingClientRect(); /* .truncate เว้นซ้าย 2px ให้หัวสระ — วัดจุดเริ่มตัวอักษร */ return { icon: icon.height, block: h.nextElementSibling.getBoundingClientRect().bottom - hr.top, descLeft: p.left + parseFloat(getComputedStyle(pe).paddingLeft) - icon.left, descGap: p.top - icon.bottom }; });
  ok(ic.icon === 52 && ic.block === 48 && ic.descLeft === 0 && ic.descGap === 12, `card: ไอคอน ${ic.icon} > ชื่อ+สถานะ ${ic.block} · คำอธิบายชิดซ้าย (${ic.descLeft}) ห่างไอคอน ${ic.descGap}`);
  // นับถอยหลังแบบนาฬิกามีวินาทีเดิน "29 วัน 23:59:59" (พี่ต่อขอ)
  const cd = card.locator('.tabular-nums').first();
  const t1 = await cd.textContent();
  await page.waitForTimeout(1200);
  const t2 = await cd.textContent();
  ok(/^\d+ วัน \d\d:\d\d:\d\d$/.test(t1) && t1 !== t2, `card: นับถอยหลังมีวินาทีเดิน (${t1} → ${t2})`);
  await card.click();
  await page.waitForSelector('[role=dialog]');
  ok((await page.locator('[role=dialog] code:has-text("SAVE100")').count()) === 1 && (await page.locator('[role=dialog] dt:has-text("ช่วงเวลา")').count()) === 1 && (await page.locator('[role=dialog] li:has-text("ยอดสั่งซื้อขั้นต่ำ")').count()) === 1, 'กดการ์ด → ป๊อปอัปรายละเอียดเต็ม (โค้ด ช่วงเวลา เงื่อนไข)');
  // หัวป๊อปอัป: ไอคอนสูงเท่าบล็อก 2 บรรทัด (ชื่อ + ส่วนลด/สถานะ) · ส่วนลดมาก่อนสถานะ · ปุ่มชิดขวา "ดูสินค้าในโปร" ขวาสุด (พี่ต่อสั่ง 2026-09-15)
  const head = await page.locator('[role=dialog] h2').evaluate((h) => {
    const icon = h.parentElement.previousElementSibling.getBoundingClientRect();
    const block = h.parentElement.getBoundingClientRect();
    const row = h.nextElementSibling;
    const [discount, status] = [row.children[0].getBoundingClientRect(), row.children[1].getBoundingClientRect()];
    const dlg = h.closest('[role=dialog]');
    const foot = dlg.lastElementChild;
    const btns = [...foot.querySelectorAll('a,button')].map((b) => ({ t: b.textContent.trim(), r: b.getBoundingClientRect() }));
    return { icon: icon.height, block: block.height, iconW: icon.width, discountLeft: discount.left, statusLeft: status.left, statusText: row.children[1].textContent, btns, footRight: foot.getBoundingClientRect().right - parseFloat(getComputedStyle(foot).paddingRight) };
  });
  ok(Math.abs(head.icon - head.block) < 0.5 && Math.abs(head.icon - head.iconW) < 0.5, `dialog: ไอคอนสูงเท่า 2 บรรทัด (${head.icon} vs ${head.block})`);
  ok(head.discountLeft < head.statusLeft && head.statusText === 'กำลังใช้งาน', 'dialog: ส่วนลดก่อน แล้วสถานะ');
  ok(head.btns.length === 2 && head.btns[1].t === 'ดูสินค้าในโปร' && Math.abs(head.btns[1].r.right - head.footRight) < 0.5 && head.btns[0].t === 'ปิด', 'dialog: ปุ่มชิดขวา ดูสินค้าในโปรขวาสุด');
  await page.keyboard.press('Escape');
  ok((await page.locator('[role=dialog]').count()) === 0, 'Esc ปิดป๊อปอัป');
  ok((await page.locator('text=เหลืออีก').count()) >= 3, 'home: countdown text');
  // drinks featured products show discounted price + badge
  const kombucha = page.locator('.group:has(h3)', { hasText: 'คอมบูชา' }).first(); // :has(h3) = การ์ดสินค้า (สไลด์ก็เป็น .group)
  ok((await kombucha.locator('text=-20%').count()) === 1, 'card: -20% badge on drinks');
  ok((await kombucha.locator('text=฿76').count()) === 1 && (await kombucha.locator('text=฿95').count()) === 1, 'card: ฿95 → ฿76');
  // ราคาเดิมขีดฆ่าอยู่บรรทัดบน ราคาโปรอยู่ล่าง (พี่ต่อสั่ง 2026-09-15)
  const pr = await kombucha.locator('.line-through').evaluate((s) => ({ strike: s.getBoundingClientRect().bottom, price: s.nextElementSibling.getBoundingClientRect().top, txt: s.nextElementSibling.textContent }));
  ok(pr.strike <= pr.price && pr.txt === '฿76', 'card: ขีดฆ่า ฿95 อยู่บน · ฿76 อยู่ล่าง');
  const granola = page.locator('.group:has(h3)', { hasText: 'กราโนล่า' }).first();
  ok((await granola.locator('text=ซื้อ 2 แถม 1').count()) === 1, 'card: bogo badge on snacks');
  await shot(page, 'p5-home');

  // /promotions page
  await page.goto(`${BASE}/promotions`);
  // ไม่มีหัวข้อย่อย กำลังใช้งาน/เร็ว ๆ นี้ (พี่ต่อเอาออก) · หัวข้อ "โปรโมชันทั้งหมด" · 5 การ์ด live 4 ใบก่อน scheduled 1 ใบ
  const badges = await page.locator('main article h3 + div').allTextContents();
  ok((await page.textContent('main h1')) === 'โปรโมชันทั้งหมด' && (await page.locator('main h2').count()) === 0 && badges.join('|') === 'กำลังใช้งาน|กำลังใช้งาน|กำลังใช้งาน|กำลังใช้งาน|เร็ว ๆ นี้', `promotions: หัวข้อ โปรโมชันทั้งหมด · ไม่มีหัวข้อย่อย · ${badges.length} การ์ด (live ก่อน)`);
  ok((await page.locator('text=ลด 10% ทั้งร้าน กลางเดือน').count()) === 0 && (await page.locator('text=SUMMER50').count()) === 0, 'promotions: expired hidden');
  ok((await page.locator('text=เริ่มใน').count()) === 1, 'promotions: upcoming shows "เริ่มใน"');
  // โครงเดียวกับหน้ารายการสินค้า (พี่ต่อสั่ง 2026-09-15): card หมวดซ้าย ตัวเลข = จำนวนโปรที่เข้าร่วม · โปรทั้งร้านนับทุกหมวด · เลือกหมวดแล้วกรอง
  const pl = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('main aside nav ul a')].map((a) => { const [n, c] = a.querySelectorAll('span'); return { label: n.textContent, count: Number(c.textContent) }; });
    return { title: document.querySelector('main aside nav p').textContent, rows, asideTop: document.querySelector('main aside nav').getBoundingClientRect().top, h1Top: document.querySelector('main h1').getBoundingClientRect().top };
  });
  const row = (l) => pl.rows.find((r) => r.label === l)?.count;
  ok(pl.title === 'หมวดหมู่สินค้า' && pl.asideTop === pl.h1Top && row('ทั้งหมด') === 5, `promotions: card หมวดซ้ายเหมือนหน้ารายการ · ทั้งหมด ${row('ทั้งหมด')}`);
  // SAVE100 (ทั้งร้าน) นับทุกหมวด → ทุกหมวด ≥ 1 · เครื่องดื่ม = SAVE100 + ลด 20% + MATCHA50 (สินค้า p-002 อยู่หมวดเครื่องดื่ม) = 3 · อาหารเสริม = SAVE100 + Flash Sale = 2
  ok(pl.rows.every((r) => r.count >= 1) && row('เครื่องดื่มสุขภาพ') === 3 && row('อาหารเสริม') === 2 && row('ชาและกาแฟ') === 1, `promotions: จำนวนต่อหมวด (เครื่องดื่ม ${row('เครื่องดื่มสุขภาพ')} · อาหารเสริม ${row('อาหารเสริม')} · ชา ${row('ชาและกาแฟ')})`);
  await page.click('main aside nav a:has-text("อาหารเสริม")');
  await page.waitForURL(/category=/);
  const names = await page.locator('main article h3').allTextContents();
  ok((await page.textContent('main h1')) === 'อาหารเสริม' && names.length === 2 && names.some((n) => n.includes('SAVE100')) && names.some((n) => n.includes('Flash Sale')) && (await page.locator('main aside nav a[aria-current=page]').textContent()).includes('อาหารเสริม'), `promotions: เลือกหมวดอาหารเสริม → ${names.length} โปร (ทั้งร้าน + Flash Sale)`);
  await page.goto(`${BASE}/promotions`);
  await shot(page, 'p5-promotions');
  // link to products in promo
  await page.locator('article', { hasText: 'ลด 20% เครื่องดื่มสุขภาพ' }).locator('a:has-text("ดูสินค้าในโปร")').click();
  await page.waitForURL(/\/category\//);
  ok((await page.locator('main a[href^="/product/"]').count()) === 4 && (await page.locator('main').locator('text=-20%').count()) === 4, 'promo link → category with 4 discounted');

  // ?promo= filter for bogo (category scope single → category page too); test products?promo for coupon-less all-scope by using upcoming promo id
  await page.goto(`${BASE}/products?promo=promo-snack-b2g1`);
  ok((await page.locator('main a[href^="/product/"]').count()) === 4 && (await page.textContent('h1')).includes('ซื้อ 2 แถม 1'), 'products?promo= filters to scope');

  // product detail: price tag lg + promo box + remaining quota
  await page.goto(`${BASE}/product/คอมบูชารสขิงมะนาว-330-มล-p-003`);
  ok(await page.locator('text=-20%').first().isVisible(), 'detail: -20% chip');
  ok(await page.locator('text=ราคาโปรเหลือ 5 ชิ้น').isVisible(), 'detail: per-product quota remaining 5');
  ok((await page.locator('span.line-through:has-text("฿95")').count()) === 1, 'detail: original strikethrough');
  await shot(page, 'p5-product');

  // time-based: set drinks promo to future → disappears; to past → disappears; back
  const promos = readPromos();
  const drinks = promos.find((p) => p.id === 'promo-drinks20');
  const orig = { s: drinks.startsAt, e: drinks.endsAt };
  drinks.startsAt = new Date(Date.now() + 3600e3).toISOString();
  writePromos(promos);
  await page.goto(`${BASE}/product/คอมบูชารสขิงมะนาว-330-มล-p-003`);
  ok((await page.locator('text=-20%').count()) === 0 && (await page.locator('span.line-through').count()) === 0, 'future startsAt → no discount');
  await page.goto(`${BASE}/promotions`);
  ok((await page.locator('article', { hasText: 'ลด 20% เครื่องดื่มสุขภาพ' }).locator('text=เริ่มใน').count()) === 1, 'future → listed under upcoming');
  drinks.startsAt = orig.s;
  drinks.endsAt = new Date(Date.now() - 1000).toISOString();
  writePromos(promos);
  await page.goto(`${BASE}/promotions`);
  ok((await page.locator('article', { hasText: 'ลด 20% เครื่องดื่มสุขภาพ' }).count()) === 0, 'past endsAt → gone from promotions');
  drinks.endsAt = orig.e;
  writePromos(promos);

  // quota exhausted via fake orders → promo disappears
  const ORDERS = DATA + '/orders.json';
  const fakeOrders = Array.from({ length: 50 }, (_, i) => ({
    id: `fake-${i}`, orderNo: `FAKE-${i}`, status: 'paid',
    customer: { name: 'x', phone: `08${String(i).padStart(8, '0')}`, email: '', address: '' },
    lines: [], subtotal: 0, discountTotal: 0, shippingFee: 0, total: 0, couponCode: 'SAVE100',
    promotionUsages: [{ promotionId: 'promo-save100', productId: null, qty: 1 }],
    paymentMethod: 'cod', note: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));
  fs.writeFileSync(ORDERS, JSON.stringify(fakeOrders, null, 2));
  await page.goto(`${BASE}/promotions`);
  ok((await page.locator('main article', { hasText: 'SAVE100' }).count()) === 0, 'coupon quota 50/50 → hidden from storefront');
  await login(page, 'admin');
  await page.goto(`${BASE}/admin/promotions`);
  ok(await page.locator('li', { hasText: 'SAVE100' }).locator('span:has-text("ครบสิทธิ์แล้ว")').first().isVisible(), 'admin: status ครบสิทธิ์แล้ว + progress');
  ok((await page.locator('li', { hasText: 'SAVE100' }).textContent()).includes('50/50'), 'admin: usage 50/50');
  fs.writeFileSync(ORDERS, '[]\n');

  // mobile
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/', '/promotions', '/product/คอมบูชารสขิงมะนาว-330-มล-p-003']) {
    await page.goto(BASE + path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 375, `mobile no h-scroll ${path} (${sw})`);
  }
  await page.goto(`${BASE}/promotions`);
  await page.screenshot({ path: SHOT + '/p5-mobile-promotions.png', fullPage: true, caret: 'initial' });
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
