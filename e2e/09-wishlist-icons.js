// รายการโปรด (ไม่ต้อง login, อยู่ข้ามการปิดเบราว์เซอร์) + ไอคอน header เรียง wishlist · cart · profile + ไม่มี emoji/ลูกศรในเมนู
const { BASE, launch, ok, shot, DATA } = require('./lib');
const { chromium } = require('playwright');
const fs = require('fs');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const GRANOLA = '/product/กราโนล่าน้ำผึ้งอัลมอนด์-300-กรัม-p-009';

(async () => {
  fs.writeFileSync(`${DATA}/wishlists.json`, '{}\n');
  let { browser, ctx, page } = await launch();

  // แถบสถานะบนสุด (แบบ Shopee): ขวา = รายการโปรด · ประวัติการสั่งซื้อ · guest/ชื่อ login · แถบหลักมีแค่ตะกร้า
  await page.goto(`${BASE}/`);
  ok((await page.locator('header a[title]').count()) === 1 && (await page.locator('header a[title="ตะกร้า"]').isVisible()), 'header icon: มีแค่ตะกร้า');
  const status = page.locator('nav[aria-label="แถบสถานะ"]');
  const items = (await status.locator('a').allTextContents()).map((t) => t.trim());
  ok(JSON.stringify(items) === JSON.stringify(['รายการโปรด', 'ประวัติการสั่งซื้อ', 'guest']), `แถบสถานะ: ${items.join(' · ')}`);
  ok((await status.locator('a[href="/account"]').boundingBox()).x + (await status.locator('a[href="/account"]').boundingBox()).width === 1200, 'ชื่อผู้ใช้อยู่ขวาสุด ตรงขอบขวาตะกร้า');
  await status.locator('a[href="/account"]').click();
  await page.waitForURL(/\/account$/);
  ok(await page.locator('h1').isVisible(), 'guest → /account');
  await page.goto(`${BASE}/`);
  ok((await page.locator('header svg').count()) >= 2, 'header uses svg icons');
  const headerText = await page.textContent('header');
  ok(!EMOJI.test(headerText), 'header has no emoji');

  // heart on card → wishlist page
  const card = page.locator('a[href^="/product/"]', { hasText: 'กราโนล่า' }).first();
  const heart = card.locator('xpath=..').locator('button[aria-label="เพิ่มในรายการโปรด"]');
  await heart.click();
  await page.waitForFunction(() => document.querySelector('nav[aria-label="แถบสถานะ"] a[href="/wishlist"]')?.textContent?.includes('(1)'));
  ok(true, 'heart on card → แถบสถานะนับรายการโปรด (1)');
  ok(new URL(page.url()).pathname === '/', 'clicking heart did not navigate to product');
  await page.goto(`${BASE}/wishlist`);
  ok((await page.locator('a[href^="/product/"]').count()) === 1 && (await page.locator('text=กราโนล่า').count()) >= 1, 'wishlist page shows granola');
  ok(await page.locator('button[aria-pressed="true"]').first().isVisible(), 'heart filled on wishlist page');
  await shot(page, 'p10-wishlist');

  // product page: toggle off via big button
  await page.goto(BASE + GRANOLA);
  const bigBtn = page.locator('button[aria-pressed="true"]:visible').first();
  ok((await bigBtn.textContent()).trim() === '' && (await bigBtn.getAttribute('aria-label')) === 'เอาออกจากรายการโปรด', 'product page: ปุ่มหัวใจไอคอนอย่างเดียว (label อยู่ที่ aria)');
  await bigBtn.click();
  await page.waitForSelector('button[aria-pressed="false"]:visible');
  ok(true, 'toggle off');
  await page.locator('button[aria-pressed="false"]:visible').first().click();
  await page.waitForSelector('button[aria-pressed="true"]:visible');

  // persists after browser restart
  const state = await ctx.storageState();
  await browser.close();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  ctx = await browser.newContext({ storageState: state, locale: 'th-TH' });
  page = await ctx.newPage();
  await page.goto(`${BASE}/wishlist`);
  ok((await page.locator('a[href^="/product/"]').count()) === 1, 'wishlist persists after reopening browser');

  // no emoji / arrows anywhere in visible UI (shop + admin)
  const { login } = require('./lib');
  const bad = [];
  for (const path of ['/', '/products', '/promotions', '/cart', '/orders', '/wishlist', '/account', GRANOLA]) {
    await page.goto(BASE + path);
    const t = await page.evaluate(() => document.body.innerText);
    if (EMOJI.test(t)) bad.push(`${path}: emoji`);
    if (/[→←]/.test(t)) bad.push(`${path}: arrow`);
  }
  await login(page, 'admin');
  for (const path of ['/admin', '/admin/products', '/admin/promotions', '/admin/promotions/new', '/admin/orders', '/admin/categories', '/admin/users', '/admin/settings']) {
    await page.goto(BASE + path);
    const t = await page.evaluate(() => document.body.innerText);
    if (EMOJI.test(t)) bad.push(`${path}: emoji`);
    if (/[→←]/.test(t)) bad.push(`${path}: arrow`);
  }
  ok(bad.length === 0, `no emoji/arrows in UI text ${bad.join(', ')}`);

  // mobile: icons + hamburger fit
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/`);
  ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375, 'mobile no h-scroll');
  ok((await page.locator('header a[title]').count()) === 1 && !(await page.locator('nav[aria-label="แถบสถานะ"]').isVisible()) && !(await page.locator('button[aria-label="เปิดเมนู"]').isVisible()), 'mobile: ตะกร้าอย่างเดียว ไม่มีปุ่มเมนู (ซ่อนแถบสถานะ)');
  // ยัง login admin อยู่จากรอบก่อน → ช่องขวาสุดเป็น การจัดการ (guest จะเป็นโปรไฟล์ — ตรวจใน e2e/02)
  ok((await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"]').count()) === 1, 'แถบเมนูล่าง: admin login เห็น การจัดการ');
  await page.screenshot({ path: `${require('./lib').SHOT}/p10-mobile-header.png`, caret: 'initial' });
  await browser.close();
  fs.writeFileSync(`${DATA}/wishlists.json`, '{}\n');
})().catch((e) => { console.error('💥', e); process.exit(1); });
