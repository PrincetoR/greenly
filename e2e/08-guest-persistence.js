// ลูกค้าไม่ต้อง login: ตะกร้า/คูปอง/ประวัติสั่งซื้ออยู่ครบหลังปิดเบราว์เซอร์ · เครื่องอื่นดูออเดอร์ได้ด้วยเลขที่+เบอร์
const { BASE, launch, ok, DATA } = require('./lib');
const { chromium } = require('playwright');
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
const cartBadge = async (page) => (await page.locator('header a[href="/cart"] span').textContent().catch(() => '0')) ?? '0';

(async () => {
  fs.writeFileSync(`${DATA}/orders.json`, '[]\n');
  fs.writeFileSync(`${DATA}/carts.json`, '{}\n');

  // ---- เครื่อง A: ใส่ตะกร้า + คูปอง แล้ว "ปิดเบราว์เซอร์" ----
  let { browser, ctx, page } = await launch();
  await add(page, KOMBUCHA, 7);
  await add(page, GRANOLA, 2);
  const cookiesA = await ctx.cookies();
  const guestA = cookiesA.find((c) => c.name === 'ec_guest');
  ok(guestA && guestA.expires - Date.now() / 1000 > 360 * 86400, `ec_guest cookie ตั้งแล้ว อายุ ~1 ปี`);
  ok(!cookiesA.some((c) => c.name === 'ec_cart'), 'ไม่ใช้ cookie ตะกร้าแบบเก่าแล้ว');
  ok(read('carts')[guestA.value]?.items.length === 2, 'ตะกร้าถูกเก็บฝั่ง server ผูก guest id');
  await page.goto(`${BASE}/cart`);
  await page.fill('input[name=code]', 'SAVE100');
  await page.click('button:has-text("ใช้โค้ด")');
  await page.waitForSelector('text=ใช้คูปอง SAVE100');
  const state = await ctx.storageState();
  await browser.close();

  // ---- เปิดใหม่ด้วย cookie เดิม (= ปิดแล้วกลับมา) ----
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  ctx = await browser.newContext({ storageState: state, locale: 'th-TH' });
  page = await ctx.newPage();
  await page.goto(`${BASE}/cart`);
  ok((await cartBadge(page)) === '9', `หลังเปิดใหม่ ตะกร้ายังมี 9 ชิ้น (badge=${await cartBadge(page)})`);
  ok(await page.locator('text=ใช้คูปอง SAVE100').isVisible(), 'คูปองที่กรอกไว้ยังอยู่');

  // สั่งซื้อ → ประวัติอยู่ที่ /orders
  await page.goto(`${BASE}/checkout`);
  await page.fill('#name', 'ลูกค้า เครื่องเอ');
  await page.fill('#phone', '081-000-1111');
  await page.fill('#address', '1 ซอยทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพ 10000');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForURL(/\/order\/OD-/);
  const orderNo = new URL(page.url()).pathname.split('/').pop();
  ok(await page.locator('text=สั่งซื้อสำเร็จ').isVisible(), `สั่งซื้อสำเร็จ ${orderNo}`);
  ok(read('orders')[0].guestIds[0] === guestA.value, 'order ผูกกับ guest id ของเครื่อง A');
  await page.goto(`${BASE}/orders`);
  ok((await page.locator(`a[href="/order/${orderNo}"]`).count()) === 1, '/orders แสดงออเดอร์ของเครื่องนี้');
  ok((await cartBadge(page)) === '0', 'ตะกร้าว่างหลังสั่งซื้อ');
  await page.screenshot({ path: `${require('./lib').SHOT}/p9-my-orders.png`, fullPage: true, caret: 'initial' });
  // header icon + mobile nav
  await page.click('button[aria-label="เมนูบัญชี"]');
  ok(await page.locator('[role=menu] a[href="/orders"]:has-text("ประวัติการสั่งซื้อ")').isVisible(), 'เมนูจุดสามจุดมี "ประวัติการสั่งซื้อ"');
  await page.setViewportSize({ width: 375, height: 800 });
  await page.click('button[aria-label="เปิดเมนู"]');
  ok(await page.locator('#mobile-menu a[href="/orders"]').isVisible(), 'drawer มือถือมีเมนูประวัติการสั่งซื้อ');
  const stateA2 = await ctx.storageState();
  await browser.close();

  // ---- เครื่อง B (ไม่มี cookie): เปิดลิงก์ออเดอร์ตรง ๆ ต้องยืนยันเบอร์ก่อน ----
  ({ browser, ctx, page } = await launch());
  await page.goto(`${BASE}/orders`);
  ok(await page.locator('text=ยังไม่มีคำสั่งซื้อในเครื่องนี้').isVisible(), 'เครื่อง B: /orders ว่าง');
  await page.goto(`${BASE}/order/${orderNo}`);
  ok(await page.locator('h1:has-text("ยืนยันตัวตน")').isVisible(), 'เครื่อง B: เปิดออเดอร์ตรง ๆ → ต้องยืนยันเบอร์');
  ok((await page.locator('text=ซอยทดสอบ').count()) === 0, 'เครื่อง B: ไม่เห็นที่อยู่ลูกค้าก่อนยืนยัน');
  await page.fill('#lookup-phone', '0899999999');
  await page.click('button:has-text("ยืนยันและดูคำสั่งซื้อ")');
  await page.waitForSelector('form [role=alert]');
  ok((await page.textContent('form [role=alert]')).includes('ไม่พบ'), 'เบอร์ผิด → ปฏิเสธ');
  await page.fill('#lookup-phone', '0810001111');
  await page.click('button:has-text("ยืนยันและดูคำสั่งซื้อ")');
  await page.waitForSelector('text=ซอยทดสอบ');
  ok(true, 'เบอร์ถูก → เห็นรายละเอียดออเดอร์');
  ok(read('orders')[0].guestIds.length === 2, 'order ผูกเพิ่มกับ guest id ของเครื่อง B');
  await page.goto(`${BASE}/orders`);
  ok((await page.locator(`a[href="/order/${orderNo}"]`).count()) === 1, 'เครื่อง B: /orders จำออเดอร์นี้แล้ว');
  // ค้นหาจากหน้า /orders ด้วยเลขที่ (ตัวพิมพ์เล็กก็ได้)
  await page.fill('#lookup-no', orderNo.toLowerCase());
  await page.fill('#lookup-phone', '081-000-1111');
  await page.click('button:has-text("ค้นหาคำสั่งซื้อ")');
  await page.waitForURL(new RegExp(`/order/${orderNo}$`));
  ok(true, 'ค้นหาจาก /orders ด้วยเลขที่+เบอร์ → เปิดออเดอร์');
  await browser.close();

  // ---- เครื่อง A ยังเห็นออเดอร์อยู่ (การ claim ไม่ได้ย้ายออก) ----
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  ctx = await browser.newContext({ storageState: stateA2, locale: 'th-TH' });
  page = await ctx.newPage();
  await page.goto(`${BASE}/orders`);
  ok((await page.locator(`a[href="/order/${orderNo}"]`).count()) === 1, 'เครื่อง A ยังเห็นออเดอร์เดิม');
  await browser.close();

  // ---- ลูกค้าเก่าที่มี cookie ตะกร้ารุ่นแรก → ย้ายเข้าตะกร้าใหม่อัตโนมัติ ----
  ({ browser, ctx, page } = await launch());
  await ctx.addCookies([{ name: 'ec_cart', value: JSON.stringify([{ productId: 'p-001', qty: 2 }]), url: BASE }]);
  await page.goto(`${BASE}/cart`);
  ok((await cartBadge(page)) === '2', 'cookie รุ่นเก่ายังอ่านได้ (2 ชิ้น)');
  await add(page, GRANOLA, 1);
  const cookiesC = await ctx.cookies();
  ok(!cookiesC.some((c) => c.name === 'ec_cart'), 'หลังแตะตะกร้า cookie เก่าถูกลบ');
  const gC = cookiesC.find((c) => c.name === 'ec_guest').value;
  ok(read('carts')[gC].items.length === 2 && (await cartBadge(page)) === '3', 'ของเก่า + ใหม่รวมอยู่ในตะกร้า server (3 ชิ้น)');
  await browser.close();

  fs.writeFileSync(`${DATA}/orders.json`, '[]\n');
  fs.writeFileSync(`${DATA}/carts.json`, '{}\n');
})().catch((e) => { console.error('💥', e); process.exit(1); });
