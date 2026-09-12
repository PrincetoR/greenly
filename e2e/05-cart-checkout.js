const { BASE, launch, login, shot, ok, DATA, SHOT } = require('./lib');
const fs = require('fs');
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));
const KOMBUCHA = '/product/คอมบูชารสขิงมะนาว-330-มล-p-003';
const GRANOLA = '/product/กราโนล่าน้ำผึ้งอัลมอนด์-300-กรัม-p-009';

async function add(page, path, qty) {
  await page.goto(BASE + path);
  await page.fill('input[name=qty]:visible', String(qty));
  await page.click('button:has-text("ใส่ตะกร้า"):visible');
  await page.waitForSelector('[role=status]:has-text("ใส่ตะกร้าแล้ว")');
}

(async () => {
  fs.writeFileSync(DATA + '/orders.json', '[]\n');
  const { browser, page } = await launch();

  // empty cart
  await page.goto(`${BASE}/cart`);
  ok(await page.locator('text=ตะกร้ายังว่างอยู่').isVisible(), 'empty cart state');
  const r = await page.goto(`${BASE}/checkout`);
  ok(new URL(page.url()).pathname === '/cart', 'checkout with empty cart → redirect /cart');

  // add 7 kombucha (promo limit 5/product) + 2 granola (bogo b2g1)
  await add(page, KOMBUCHA, 7);
  await add(page, GRANOLA, 2);
  await page.goto(`${BASE}/cart`);
  ok((await page.locator('text=(5/7 ชิ้น)').count()) === 1, 'cart: discount applies to 5/7');
  ok((await page.locator('text=ใช้ได้อีก 5 ชิ้น').count()) === 1, 'cart: warning shown');
  ok((await page.locator('text=ของแถม').count()) >= 1, 'cart: gift line present');
  const totalText = async () => (await page.textContent('dd.text-2xl')).trim();
  ok((await totalText()) === '฿998', `cart total before coupon = ฿998 (got ${await totalText()})`);
  await shot(page, 'p6-cart');

  // coupon invalid → error, valid → applied
  await page.fill('input[name=code]', 'NOPE');
  await page.click('button:has-text("ใช้โค้ด")');
  await page.waitForSelector('form p[role=alert]:has-text("ไม่พบคูปอง")');
  ok(true, 'coupon invalid message');
  await page.fill('input[name=code]', 'save100');
  await page.click('button:has-text("ใช้โค้ด")');
  await page.waitForSelector('text=ใช้คูปอง SAVE100');
  ok((await totalText()) === '฿898', `cart total with coupon = ฿898 (got ${await totalText()})`);
  ok((await page.locator('text=ประหยัดไป').count()) === 1, 'savings line');

  // qty change auto-submit: kombucha 7 → 3
  await page.selectOption('select[name=qty] >> nth=0', '3');
  await page.waitForFunction(() => !document.querySelector('[class*="line-through"]')?.textContent?.includes('฿665'));
  await page.waitForLoadState('networkidle');
  ok((await page.locator('text=(5/7 ชิ้น)').count()) === 0, 'qty updated → warning gone');
  // ยอดตอนนี้: kombucha 3×95=285 -57 = 228 · granola 378 + gift 189 - 189 = 378 → afterItems 606 ≥ 500 → coupon -100 → 506 + ค่าส่ง 50 = 556
  ok((await totalText()) === '฿556', `cart total after qty change = ฿556 (got ${await totalText()})`);

  // checkout: validation
  await page.click('a:has-text("ไปชำระเงิน")');
  await page.waitForURL(/\/checkout/);
  await page.fill('#name', 'ทดสอบ ระบบ');
  await page.fill('#phone', '12345');
  await page.fill('#address', 'สั้น');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForSelector('form p[role=alert]');
  const errs = await page.locator('form p[role=alert]').allTextContents();
  ok(errs.some((e) => e.includes('เบอร์โทร')) && errs.some((e) => e.includes('ที่อยู่')), `checkout validation: ${errs.join(' | ')}`);
  await shot(page, 'p6-checkout-errors');

  // checkout success
  await page.fill('#phone', '081-234-5678');
  await page.fill('#address', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม 10110');
  await page.click('label:has-text("เก็บเงินปลายทาง")');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForURL(/\/order\/OD-\d{8}-0001\?new=1/);
  ok(true, `order page ${page.url()}`);
  ok(await page.locator('text=สั่งซื้อสำเร็จ').isVisible(), 'success banner');
  ok(await page.locator('text=เก็บเงินปลายทาง').first().isVisible(), 'payment info');
  await shot(page, 'p6-order');
  let orders = read('orders');
  ok(orders.length === 1 && orders[0].total === 55600 && orders[0].couponCode === 'SAVE100', `order stored total=${orders[0]?.total}`);
  ok(orders[0].lines.some((l) => l.isGift) && orders[0].promotionUsages.length === 3, 'order has gift line + 3 usages');
  ok(orders[0].customer.phone === '0812345678', 'phone normalized');
  const products = read('products');
  ok(products.find((p) => p.id === 'p-003').stock === 77 && products.find((p) => p.id === 'p-009').stock === 97, 'stock decremented incl. gift (80→77, 100→97)');
  ok((await page.locator('header a[href="/cart"] span').count()) === 0, 'cart cleared');

  // second order same phone: coupon perCustomer=1 → blocked · bogo perCustomer=1 → no gift → confirm twice
  await add(page, GRANOLA, 2);
  await add(page, KOMBUCHA, 3);
  await page.goto(`${BASE}/cart`);
  await page.fill('input[name=code]', 'SAVE100');
  await page.click('button:has-text("ใช้โค้ด")');
  await page.waitForSelector('text=ใช้คูปอง SAVE100'); // ตะกร้ายังไม่รู้เบอร์ → ใช้ได้ก่อน
  ok((await page.locator('text=ของแถม').count()) >= 1, '2nd cart: gift shown (phone unknown yet)');
  await page.goto(`${BASE}/checkout`);
  await page.fill('#name', 'ทดสอบ ระบบ');
  await page.fill('#phone', '0812345678');
  await page.fill('#address', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม 10110');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForSelector('form [role=alert]');
  ok((await page.textContent('form [role=alert]')).includes('ใช้ไม่ได้'), 'coupon per-customer blocked at checkout');
  await page.goto(`${BASE}/cart`);
  await page.click('button:has-text("นำออก")');
  await page.waitForLoadState('networkidle');
  await page.goto(`${BASE}/checkout`);
  await page.fill('#name', 'ทดสอบ ระบบ');
  await page.fill('#phone', '0812345678');
  await page.fill('#address', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กทม 10110');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForSelector('form [role=status]');
  const warn = await page.textContent('form [role=status]');
  ok(warn.includes('ของแถมเปลี่ยนเป็น 0 ชิ้น'), `gift changed prompt (bogo per-customer blocked): ${warn.slice(0, 70)}`);
  ok((await page.inputValue('#phone')) === '0812345678', 'checkout values kept after prompt');
  await shot(page, 'p6-checkout-total-changed');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForURL(/\/order\/OD-\d{8}-0002\?new=1/);
  orders = read('orders');
  // kombucha: quota 5 ชิ้น/สินค้า ใช้ไป 3 ในออเดอร์แรก → ลดได้อีก 2 → 285-38=247 · granola 378 · ค่าส่ง 50 = 675
  ok(orders[1].total === 67500 && !orders[1].lines.some((l) => l.isGift) && orders[1].couponCode === null, `2nd order: no gift, no coupon, per-product quota carried over → total 675 (got ${orders[1].total})`);

  // admin: promotion usage reflects
  await login(page, 'admin');
  await page.goto(`${BASE}/admin/promotions`);
  ok((await page.locator('li', { hasText: 'SAVE100' }).textContent()).includes('1/50'), 'admin usage SAVE100 1/50');
  ok((await page.locator('li', { hasText: 'ซื้อ 2 แถม 1' }).textContent()).includes('ใช้ไป 1'), 'admin usage bogo 1');

  // mobile
  await page.setViewportSize({ width: 375, height: 800 });
  await add(page, KOMBUCHA, 1);
  for (const path of ['/cart', '/checkout', `/order/${orders[0].orderNo}`]) {
    await page.goto(BASE + path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 375, `mobile no h-scroll ${path} (${sw})`);
  }
  await page.goto(`${BASE}/cart`);
  await page.screenshot({ path: SHOT + '/p6-mobile-cart.png', fullPage: true, caret: 'initial' });
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
