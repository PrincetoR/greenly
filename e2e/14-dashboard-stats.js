// แดชบอร์ด = KPI 4 ใบ + สถิติ (ยอดขายราย วัน/เดือน/ปี · โปรกระตุ้นยอด · หมวด/สินค้าขายดี) — ใช้ seed เต็ม (มีประวัติออเดอร์ 24 เดือน)
const { execSync } = require('node:child_process');
const path = require('node:path');
const { BASE, DATA, launch, login, shot, ok } = require('./lib');

(async () => {
  execSync('npm run -s seed', { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  const orders = JSON.parse(require('node:fs').readFileSync(`${DATA}/orders.json`, 'utf8'));
  ok(orders.length > 300, `seed เต็มมีประวัติออเดอร์ (${orders.length})`);

  const { browser, page } = await launch();
  await login(page, 'admin', 'admin1234');

  // รายวัน (ค่าเริ่มต้น)
  await page.goto(`${BASE}/admin`);
  ok((await page.locator('main h1').count()) === 0 && (await page.locator('main > div > div.min-w-0 > div > div.grid:first-child > *').count()) === 4, 'KPI 4 ใบ ไม่มีหัวข้อ');
  ok((await page.locator('main h2').allTextContents()).map((t) => t.trim()).join('|') === 'ยอดขาย|โปรโมชันกระตุ้นยอดขาย|หมวดหมู่ไหนขายดี|สินค้าขายดี 5 อันดับ', 'การ์ดสถิติ 4 ใบ (ไม่มีรายการออเดอร์/โปร/สต็อกแบบเดิม)');
  ok((await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').count()) === 30, 'รายวัน: กราฟ 30 แท่ง');
  ok((await page.locator('nav[aria-label="ช่วงเวลา"] a[aria-current=page]').textContent()).trim() === 'รายวัน', 'แท็บรายวัน active');
  const revenueText = await page.locator('main h2:has-text("ยอดขาย")').locator('xpath=ancestor::div[contains(@class,"rounded-card")]').locator('p.text-2xl').first().textContent();
  ok(/^฿[\d,]+/.test(revenueText.trim()), `ยอดขาย 30 วัน = ${revenueText.trim()}`);
  ok((await page.locator('main h2:has-text("โปรโมชันกระตุ้นยอดขาย")').locator('xpath=ancestor::div[contains(@class,"rounded-card")]').locator('p.text-2xl').count()) === 0, 'การ์ดโปร: ไม่มีแถวสรุปรวมเหนือตาราง (พี่ต่อเอาออก)');
  ok((await page.locator('main table tbody tr').count()) >= 4, 'ตารางโปรโมชัน: มีโปรที่คาบเกี่ยว 30 วัน (กลางเดือน + 3 ตัวที่กำลังใช้)');
  const midMonth = page.locator('main table tbody tr', { hasText: 'ลด 10% ทั้งร้าน กลางเดือน' });
  ok((await midMonth.count()) === 1 && !/\b0\b/.test((await midMonth.locator('td').nth(1).textContent()).trim()), 'โปรกลางเดือนมีออเดอร์ที่ใช้ > 0');
  ok((await page.locator('main ol').first().locator('> li').count()) === 6, 'หมวดหมู่ครบ 6 หมวด');
  ok(await page.locator('main span:has-text("ขายดีสุด")').isVisible() && (await page.locator('main span:has-text("ขายน้อยสุด")').isVisible()), 'ป้ายขายดีสุด/ขายน้อยสุด');
  ok((await page.locator('main ol').nth(1).locator('> li').count()) === 5, 'สินค้าขายดี 5 อันดับ');
  await shot(page, 'p14-dashboard-day');

  // รายเดือน / รายปี
  await page.click('nav[aria-label="ช่วงเวลา"] a:has-text("รายเดือน")');
  await page.waitForURL(/range=month/);
  ok((await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').count()) === 12, 'รายเดือน: กราฟ 12 แท่ง');
  ok((await page.locator('main table tbody tr').count()) >= 6, 'รายเดือน: โปรในอดีต (SUMMER50, ครบรอบร้าน) โผล่ในตาราง');
  await shot(page, 'p14-dashboard-month');
  await page.click('nav[aria-label="ช่วงเวลา"] a:has-text("รายปี")');
  await page.waitForURL(/range=year/);
  ok((await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').count()) === 5, 'รายปี: กราฟ 5 แท่ง');
  const yearLabels = await page.locator('main figure > ul li').allTextContents();
  ok(yearLabels.every((t) => /^25\d\d$/.test(t.trim())), `รายปี: ป้ายเป็น พ.ศ. (${yearLabels.join(' ')})`);

  // staff เห็นแดชบอร์ดได้ (ไม่มีลิงก์โปร)
  await page.context().clearCookies();
  await login(page, 'staff', 'staff1234');
  ok((await page.locator('main table tbody tr a[href^="/admin/promotions/"]').count()) === 0, 'staff: ชื่อโปรไม่เป็นลิงก์');

  // คำสั่งซื้อแบ่งหน้า 50
  await page.goto(`${BASE}/admin/orders`);
  ok((await page.locator('tbody tr').count()) === 50, 'คำสั่งซื้อ: หน้าละ 50');
  await page.click('nav[aria-label="แบ่งหน้า"] a:has-text("ถัดไป")');
  await page.waitForURL(/page=2/);
  ok((await page.locator('nav[aria-label="แบ่งหน้า"]').textContent()).includes('หน้า 2 /'), 'คำสั่งซื้อ: ไปหน้า 2 ได้');

  // มือถือไม่มี scroll ข้าง
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/admin`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 375, `มือถือ: ไม่มี scroll แนวนอน (scrollWidth=${sw})`);
  await shot(page, 'p14-dashboard-mobile');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
