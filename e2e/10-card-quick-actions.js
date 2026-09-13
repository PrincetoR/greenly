// การ์ดสินค้า: แถวราคามีหัวใจ + ใส่ตะกร้า กดได้เลยไม่ต้องเข้าหน้าสินค้า
const { BASE, launch, ok, shot, DATA } = require('./lib');
const fs = require('fs');
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));

(async () => {
  fs.writeFileSync(`${DATA}/carts.json`, '{}\n');
  fs.writeFileSync(`${DATA}/wishlists.json`, '{}\n');
  const { browser, page } = await launch();
  await page.goto(`${BASE}/`);

  const card = page.locator('.group', { hasText: 'กราโนล่า' }).first();
  // หัวใจกับตะกร้าอยู่แถวเดียวกับราคา (แนวตั้งใกล้กัน) และเรียง หัวใจ → ตะกร้า
  const priceBox = await card.locator('span.font-bold').first().boundingBox();
  const heartBox = await card.locator('button[aria-label="เพิ่มในรายการโปรด"]').boundingBox();
  const cartBox = await card.locator('button[aria-label="ใส่ตะกร้า"]').boundingBox();
  ok(Math.abs(priceBox.y + priceBox.height / 2 - (heartBox.y + heartBox.height / 2)) < 20, 'หัวใจอยู่ระดับเดียวกับราคา');
  ok(heartBox.x < cartBox.x && Math.abs(heartBox.y - cartBox.y) < 2, 'ตะกร้าอยู่ถัดจากหัวใจ');

  // ใส่ตะกร้าจากหน้าแรก 2 ครั้ง → badge 2, ยังอยู่หน้าแรก
  await card.locator('button[aria-label="ใส่ตะกร้า"]').click();
  await page.waitForSelector('button[aria-label="ใส่ตะกร้าแล้ว"]');
  ok(true, 'กดแล้วโชว์เครื่องหมายถูก');
  await page.waitForFunction(() => document.querySelector('header a[title="ตะกร้า"] span')?.textContent === '1');
  await page.waitForSelector('button[aria-label="ใส่ตะกร้าแล้ว"]', { state: 'detached' });
  await card.locator('button[aria-label="ใส่ตะกร้า"]').click();
  await page.waitForFunction(() => document.querySelector('header a[title="ตะกร้า"] span')?.textContent === '2');
  ok(new URL(page.url()).pathname === '/', 'ยังอยู่หน้าแรก ไม่ต้องเข้าหน้าสินค้า');
  const cartItems = Object.values(read('carts'))[0].items;
  ok(cartItems.length === 1 && cartItems[0].qty === 2, 'ตะกร้า server มี 2 ชิ้น');
  await shot(page, 'p11-card-actions');

  // สินค้าหมด → ปุ่มตะกร้ากดไม่ได้
  const products = read('products');
  const target = products.find((p) => p.id === 'p-001');
  const stock = target.stock;
  target.stock = 0;
  fs.writeFileSync(`${DATA}/products.json`, JSON.stringify(products, null, 2) + '\n');
  await page.goto(`${BASE}/products?q=น้ำผักผลไม้`);
  const dead = page.locator('.group', { hasText: 'น้ำผักผลไม้' }).first().locator('button[aria-label="สินค้าหมด"]');
  ok(await dead.isDisabled(), 'สินค้าหมด → ปุ่มใส่ตะกร้า disabled');
  target.stock = stock;
  fs.writeFileSync(`${DATA}/products.json`, JSON.stringify(products, null, 2) + '\n');

  // มือถือ 2 คอลัมน์ไม่ล้น
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/products`);
  ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375, 'mobile no h-scroll');
  const c = page.locator('.group').first();
  const cb = await c.boundingBox();
  const bb = await c.locator('button[aria-label="ใส่ตะกร้า"]').boundingBox();
  ok(bb.x + bb.width <= cb.x + cb.width + 1, 'ปุ่มไม่ล้นขอบการ์ดบนมือถือ');
  await page.screenshot({ path: `${require('./lib').SHOT}/p11-mobile-cards.png`, caret: 'initial' });
  await browser.close();
  fs.writeFileSync(`${DATA}/carts.json`, '{}\n');
})().catch((e) => { console.error('💥', e); process.exit(1); });
