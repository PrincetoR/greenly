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
  ok((await page.locator('article').count()) === 3, 'home: 3 live promo cards');
  ok(await page.locator('article', { hasText: 'SAVE100' }).first().isVisible() && (await page.locator('article code').count()) === 0, 'home: coupon code in summary sentence (ไม่มีกล่องใช้โค้ด)');
  ok((await page.locator('text=เหลืออีก').count()) >= 3, 'home: countdown text');
  // drinks featured products show discounted price + badge
  const kombucha = page.locator('.group:has(h3)', { hasText: 'คอมบูชา' }).first(); // :has(h3) = การ์ดสินค้า (สไลด์ก็เป็น .group)
  ok((await kombucha.locator('text=-20%').count()) === 1, 'card: -20% badge on drinks');
  ok((await kombucha.locator('text=฿76').count()) === 1 && (await kombucha.locator('text=฿95').count()) === 1, 'card: ฿95 → ฿76');
  const granola = page.locator('.group:has(h3)', { hasText: 'กราโนล่า' }).first();
  ok((await granola.locator('text=ซื้อ 2 แถม 1').count()) === 1, 'card: bogo badge on snacks');
  await shot(page, 'p5-home');

  // /promotions page
  await page.goto(`${BASE}/promotions`);
  ok((await page.textContent('h2:has-text("กำลังใช้งาน")')).includes('(3)'), 'promotions: 3 live');
  ok((await page.textContent('h2:has-text("เร็ว ๆ นี้")')).includes('(1)'), 'promotions: 1 upcoming');
  ok((await page.locator('text=ลด 10% ทั้งร้าน กลางเดือน').count()) === 0 && (await page.locator('text=SUMMER50').count()) === 0, 'promotions: expired hidden');
  ok((await page.locator('text=เริ่มใน').count()) === 1, 'promotions: upcoming shows "เริ่มใน"');
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
