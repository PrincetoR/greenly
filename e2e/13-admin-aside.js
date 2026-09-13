// หลังบ้านใช้ header หน้าร้าน + card เมนู "จัดการสินค้า" ดีไซน์เดียวกับ card หมวดหมู่สินค้า — เส้นแนวตั้ง/แนวนอนต้องตรงกันทุกเส้น
const { BASE, launch, login, shot, ok } = require('./lib');

const box = (page, sel) => page.locator(sel).first().boundingBox();
const near = (a, b) => Math.abs(a - b) < 0.5;

(async () => {
  const { browser, page } = await launch();
  await login(page, 'admin', 'admin1234');

  // เส้นอ้างอิงจากหน้าสินค้าทั้งหมด
  await page.goto(`${BASE}/products`);
  const shop = { card: await box(page, 'main aside nav'), first: await box(page, 'main aside nav ul a'), line: await box(page, 'main aside nav div[aria-hidden]'), heading: await box(page, 'main aside nav p') };

  await page.goto(`${BASE}/admin`);
  ok(await page.locator('header nav[aria-label="เมนูหลัก"] a[href="/admin"][class*="bg-brand-soft"]').isVisible(), 'หลังบ้านใช้ header หน้าร้าน · เมนูการจัดการ active');
  ok((await page.textContent('main aside nav p')).trim() === 'จัดการสินค้า', 'บรรทัดแรกของ card = จัดการสินค้า');
  const labels = await page.locator('main aside nav ul a').allTextContents();
  ok(JSON.stringify(labels.map((t) => t.trim())) === JSON.stringify(['แดชบอร์ด', 'สินค้า', 'หมวดหมู่', 'โปรโมชัน', 'คำสั่งซื้อ', 'ผู้ใช้', 'ตั้งค่าร้าน']), `เมนู: ${labels.join(' · ')}`);
  ok((await page.getAttribute('main aside nav ul a[aria-current=page]', 'href')) === '/admin', 'แดชบอร์ด active');

  const card = await box(page, 'main aside nav');
  const line = await box(page, 'main aside nav div[aria-hidden]');
  const first = await box(page, 'main aside nav ul a');
  const heading = await box(page, 'main aside nav p');
  const pill = await box(page, 'header nav[aria-label="เมนูหลัก"] a[href="/products"]');
  const promoText = await page.evaluate(() => {
    const a = document.querySelector('header nav[aria-label="เมนูหลัก"] a[href="/promotions"]');
    const r = document.createRange();
    r.selectNodeContents(a);
    return r.getBoundingClientRect().left;
  });
  const h1 = await box(page, 'main h1');
  const content = await box(page, 'main > div > div.min-w-0');

  ok(['x', 'y', 'width'].every((k) => near(card[k], shop.card[k])), `card เมนูตำแหน่ง/กว้างเท่า card หมวดหมู่ (${card.x},${card.y},${card.width})`);
  ok(near(line.y, shop.line.y) && near(first.y, shop.first.y) && near(heading.y, shop.heading.y), `เส้นคั่น ${line.y} · รายการแรก ${first.y} · หัว ${heading.y} ตรงกับหน้าสินค้า`);
  ok(near(pill.x + pill.width, card.x + card.width), `ขอบขวา "สินค้าทั้งหมด" = ขอบขวา card (${pill.x + pill.width} / ${card.x + card.width})`);
  ok(near(promoText, content.x), `"โปรโมชัน" เริ่มที่ขอบซ้ายเนื้อหา (${promoText} / ${content.x})`);
  ok(near(h1.y + h1.height / 2, heading.y + heading.height / 2) && near(h1.y, card.y), `หัวข้อหน้า กึ่งกลางตรง "จัดการสินค้า" และขอบบนตรง card (${h1.y} / ${card.y})`);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('main aside nav div[aria-hidden]'), '::after').content === '""'), 'เส้นคั่นมีหัวลูกศร (divider-caret)');
  await shot(page, 'p13-admin-aside');

  // sticky เหมือนหน้าสินค้า
  await page.goto(`${BASE}/admin/products`);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(150);
  ok(near((await box(page, 'main aside nav')).y, 81), 'เลื่อนแล้ว card เมนูติดใต้ header ที่ 81');
  ok((await page.getAttribute('main aside nav ul a[aria-current=page]', 'href')) === '/admin/products', 'หน้าสินค้า → เมนูสินค้า active');

  // staff เห็นเมนูน้อยกว่า
  await page.context().clearCookies();
  await login(page, 'staff', 'staff1234');
  const staffLabels = await page.locator('main aside nav ul a').allTextContents();
  ok(JSON.stringify(staffLabels.map((t) => t.trim())) === JSON.stringify(['แดชบอร์ด', 'สินค้า', 'หมวดหมู่', 'คำสั่งซื้อ']), `staff: ${staffLabels.join(' · ')}`);
  ok((await page.textContent('main aside > div')).includes('พนักงาน'), 'card ผู้ใช้แสดง role');

  // มือถือ: ซ่อน card → เมนูหลังบ้านอยู่ใน drawer ของ header + ออกจากระบบ
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/admin/orders`);
  ok(!(await page.locator('main aside').isVisible()), 'มือถือ: ซ่อน card เมนู');
  await page.click('button[aria-label="เปิดเมนู"]');
  ok(await page.locator('#mobile-menu a[href="/admin/orders"][aria-current=page]').isVisible(), 'มือถือ: เมนูหลังบ้านใน drawer · หน้าปัจจุบัน active');
  await shot(page, 'p13-admin-mobile-drawer');
  await page.click('#mobile-menu button:has-text("ออกจากระบบ")');
  await page.waitForURL(/\/admin\/login/);
  ok(page.url().includes('/admin/login'), 'มือถือ: ออกจากระบบจาก drawer ได้');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
