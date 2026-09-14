// แดชบอร์ด = KPI 4 ใบ + สถิติ (ยอดขายราย วัน/เดือน/ปี · โปรกระตุ้นยอด · หมวด/สินค้าขายดี) — ใช้ seed เต็ม (มีประวัติออเดอร์ 24 เดือน)
const { execSync } = require('node:child_process');
const path = require('node:path');
const { BASE, DATA, launch, login, shot, ok } = require('./lib');

(async () => {
  execSync('npm run -s seed', { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  const orders = JSON.parse(require('node:fs').readFileSync(`${DATA}/orders.json`, 'utf8'));
  ok(orders.length > 300, `seed เต็มมีประวัติออเดอร์ (${orders.length})`);

  const { browser, page } = await launch();

  // หน้าแรก: ป๊อปอัปเด้งครั้งแรก (seed เต็มเปิดไว้) → ปิด → โหลดใหม่ไม่เด้ง (วันละครั้ง) → ?popup=1 บังคับโชว์
  await page.goto(`${BASE}/`);
  await page.waitForSelector('[role=dialog][aria-labelledby=welcome-popup-title]');
  ok((await page.locator('#welcome-popup-title').textContent()).includes('ลูกค้าใหม่'), 'ป๊อปอัปตอนเข้าเว็บเด้งครั้งแรก');
  ok((await page.locator('[role=dialog] a[href="/promotions"]').count()) === 1 && (await page.locator('[role=dialog] button').count()) === 1, 'ป๊อปอัป: คลิกรูป/เนื้อหาไปลิงก์ได้ ไม่มีปุ่ม (มีแค่กากบาท)');
  ok(Math.round((await page.locator('[role=dialog]').boundingBox()).width) === 480, 'ป๊อปอัปกว้าง 480 ตามตั้งค่า');
  await page.click('[role=dialog] button[aria-label="ปิด"]');
  await page.reload();
  await page.waitForTimeout(800);
  ok((await page.locator('[role=dialog]').count()) === 0, 'ปิดแล้วโหลดใหม่ไม่เด้ง (วันละครั้ง)');
  await page.goto(`${BASE}/?popup=1`);
  await page.waitForSelector('[role=dialog]');
  ok(true, '?popup=1 บังคับโชว์ (ดูตัวอย่างจากหลังบ้าน)');
  await page.keyboard.press('Escape');
  ok((await page.locator('[role=dialog]').count()) === 0, 'Esc ปิดป๊อปอัป');

  // สไลด์: 3 สไลด์ กดถัดไปแล้วจุดที่ 2 active · คลิกสไลด์ไปตามลิงก์
  await page.goto(`${BASE}/`);
  ok((await page.locator('[aria-roledescription=slide]').count()) === 3 && (await page.locator('[role=tab][aria-label^="สไลด์"]').count()) === 3, 'สไลด์แบนเนอร์ 3 ใบ + จุด 3 จุด');
  ok((await page.locator('[aria-label="แบนเนอร์เล็ก"] > a').count()) === 2, 'ภาพเล็กด้านขวา 2 ช่อง (แบบ Shopee) คลิกได้');
  const hero = await page.evaluate(() => {
    const c = document.querySelector('[aria-roledescription=carousel]').getBoundingClientRect();
    const side = document.querySelector('[aria-label="แบนเนอร์เล็ก"]').getBoundingClientRect();
    const band = document.querySelector('[aria-roledescription=carousel]').closest('.bg-surface').getBoundingClientRect();
    const header = document.querySelector('header').getBoundingClientRect();
    return { left: Math.round(c.left), right: Math.round(side.right), bandLeft: band.left, bandRight: band.right, bandTop: band.top, headerBottom: header.bottom, borderTop: getComputedStyle(document.querySelector('[aria-roledescription=carousel]').closest('.bg-surface')).borderTopWidth };
  });
  const hb = () => page.evaluate(() => getComputedStyle(document.querySelector('header')).borderBottomColor);
  const fade = () => page.evaluate(() => Number(document.querySelector('[data-hero-content]').style.opacity));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => document.querySelector('[data-hero-content]')?.style.opacity === '1'); // รอ HeroHeaderSync ตั้งค่ารอบแรก
  ok((await hb()) === 'rgba(0, 0, 0, 0)' && (await fade()) === 1, 'อยู่บนสุด: เส้นล่าง header โปร่ง · แบนเนอร์ชัด 100%');
  // ปิด snap/การเกลี่ยชั่วคราวเพื่อวัดค่ากลางทาง (ของจริงเห็นตอนลากทัชแพด/ระหว่างแอนิเมชัน)
  await page.addStyleTag({ content: 'html{scroll-snap-type:none!important}' });
  await page.evaluate(() => (document.documentElement.dataset.noSettle = ''));
  const bandH = await page.evaluate(() => document.querySelector('[data-hero-band]').getBoundingClientRect().height);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(bandH * 0.15));
  await page.waitForTimeout(150);
  ok(Math.abs((await fade()) - 0.5) < 0.05 && (await hb()) === 'rgba(0, 0, 0, 0)', `เลื่อน 15% ของแถบ: จาง 50% · เส้น header ยังไม่โผล่ (opacity ${await fade()})`);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(bandH * 0.3) + 2);
  await page.waitForTimeout(150);
  ok((await fade()) === 0 && (await hb()) === 'rgba(0, 0, 0, 0)', 'เลื่อน 30%: จางหมด · เส้น header ยังไม่โผล่ (เส้นล่างของแถบยังทำหน้าที่อยู่)');
  // เส้นล่างของแถบขึ้นมาถึงขอบล่าง header sticky (สูง 65) เมื่อ scrollY = bandBottom(ตอนบนสุด) − 65 → header รับช่วงเส้นต่อ
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  const reach = await page.evaluate(() => Math.round(document.querySelector('[data-hero-band]').getBoundingClientRect().bottom - document.querySelector('header').offsetHeight));
  await page.evaluate((y) => window.scrollTo(0, y - 5), reach);
  await page.waitForTimeout(150);
  ok((await hb()) === 'rgba(0, 0, 0, 0)', 'ก่อนเส้นแถบถึง header 5px: เส้น header ยังโปร่ง');
  await page.evaluate((y) => window.scrollTo(0, y + 2), reach);
  await page.waitForTimeout(150);
  ok((await hb()) !== 'rgba(0, 0, 0, 0)', 'เส้นแถบขึ้นมาถึง header → เส้น header รับช่วงต่อ');
  // ตำแหน่ง snap ที่หมวดหมู่ (หัวข้อที่ 81): เส้นแถบอยู่ใต้ header แล้ว → เส้น header ต้องแสดง
  await page.evaluate(() => { const s = document.querySelector('.snap-section'); window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 81); });
  await page.waitForTimeout(150);
  ok((await hb()) !== 'rgba(0, 0, 0, 0)', 'snap ที่หมวดหมู่: เส้น header แสดง');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  ok((await fade()) === 1 && (await hb()) === 'rgba(0, 0, 0, 0)', 'กลับบนสุด: ชัด 100% เส้นโปร่งอีกครั้ง');
  // ล้อเมาส์นิดเดียว (30px) → พอหยุดหมุน เกลี่ยไปกลุ่มถัดไป · หมุนกลับ → กลุ่มก่อนหน้า
  await page.reload();
  await page.waitForTimeout(900);
  await page.keyboard.press('Escape');
  await page.mouse.move(640, 500);
  const sectionAt81 = () => page.evaluate(() => [...document.querySelectorAll('.snap-section')].find((s) => Math.abs(s.getBoundingClientRect().top - 81) < 1)?.querySelector('h2').textContent.trim() ?? null);
  await page.mouse.wheel(0, 30);
  await page.waitForTimeout(900);
  ok((await sectionAt81()) === 'หมวดหมู่', 'หมุนล้อ 30px → หยุดที่หมวดหมู่ทันที');
  await page.mouse.wheel(0, 30);
  await page.waitForTimeout(900);
  ok((await sectionAt81()) === 'โปรโมชันตอนนี้', 'หมุนอีกนิด → โปรโมชันตอนนี้');
  await page.mouse.wheel(0, -30);
  await page.waitForTimeout(900);
  ok((await sectionAt81()) === 'หมวดหมู่', 'หมุนกลับ → หมวดหมู่');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  ok(hero.left === 80 && hero.right === 1200 && hero.bandLeft === 0 && hero.bandRight === 1280 && hero.bandTop === hero.headerBottom && hero.borderTop === '0px', `แถบแบนเนอร์ขาวสุดจอ ต่อจาก header ไม่มีเส้นบน · เนื้อหา 80–1200 (${JSON.stringify(hero)})`);
  await page.hover('[aria-roledescription=carousel]');
  await page.click('button[aria-label="สไลด์ถัดไป"]');
  await page.waitForTimeout(800);
  ok((await page.getAttribute('[role=tab][aria-label="สไลด์ 2"]', 'aria-selected')) === 'true', 'กดถัดไป → สไลด์ 2');
  ok((await page.locator('[aria-roledescription=slide]').nth(1).locator('a[href="/products?sort=newest"]').count()) === 1 && (await page.locator('[aria-roledescription=slide] a button, [aria-roledescription=slide] a span[class*="bg-brand"]').count()) === 0, 'สไลด์ 2 คลิกทั้งภาพไป /products?sort=newest ไม่มีปุ่ม');
  ok((await page.locator('h1').count()) === 1, 'หน้าแรกยังมี h1 (ซ่อนไว้)');

  // หน้าแรก: สินค้าขายดีอยู่ระหว่างสินค้าแนะนำกับสินค้าใหม่ (จัดอันดับจากออเดอร์จริง)
  await page.goto(`${BASE}/`);
  const homeH2 = (await page.locator('main h2').allTextContents()).map((t) => t.trim());
  ok(JSON.stringify(homeH2) === JSON.stringify(['หมวดหมู่', 'โปรโมชันตอนนี้', 'สินค้าแนะนำ', 'สินค้าขายดี', 'สินค้าใหม่']), `หน้าแรก: ลำดับ หมวดหมู่ · โปรโมชันตอนนี้ · สินค้าแนะนำ · สินค้าขายดี · สินค้าใหม่ (${homeH2.join(' · ')})`);
  ok((await page.locator('span:has-text("ขายดี #1")').count()) === 1 && (await page.locator('span:has-text("ขายดี #8")').count()) === 1, 'หน้าแรก: การ์ดขายดี 8 ใบมีป้ายอันดับ');

  await login(page, 'admin', 'admin1234');

  // หลังบ้าน › หน้าแรก: แก้ความกว้างป๊อปอัปเป็น 640 → หน้าแรกใช้ค่าใหม่
  await page.goto(`${BASE}/admin/homepage`);
  ok((await page.locator('main li:has(a[href^="/admin/homepage?edit="])').count()) === 5, 'หลังบ้าน: รายการ 5 (สไลด์ใหญ่ 3 + ภาพเล็ก 2)');
  await page.fill('#popup-width', '640');
  await page.click('button:has-text("บันทึกป๊อปอัป")');
  await page.waitForURL(/saved=popup/);
  await page.goto(`${BASE}/?popup=1`);
  await page.waitForSelector('[role=dialog]');
  ok(Math.round((await page.locator('[role=dialog]').boundingBox()).width) === 640, 'ป๊อปอัปกว้าง 640 หลังแก้ในหลังบ้าน');
  await page.keyboard.press('Escape');
  await page.goto(`${BASE}/admin/homepage`);
  await page.fill('#popup-width', '480');
  await page.click('button:has-text("บันทึกป๊อปอัป")');
  await page.waitForURL(/saved=popup/);

  // รายวัน (ค่าเริ่มต้น)
  await page.goto(`${BASE}/admin`);
  ok((await page.locator('main h1').count()) === 0 && (await page.locator('main > div > div.min-w-0 > div > div.grid:first-child > *').count()) === 4, 'KPI 4 ใบ ไม่มีหัวข้อ');
  ok((await page.locator('main h2').allTextContents()).map((t) => t.trim()).join('|') === 'ยอดขาย|โปรโมชันกระตุ้นยอดขาย 5 อันดับ|หมวดหมู่ขายดี 5 อันดับ|สินค้าขายดี 5 อันดับ', 'การ์ดสถิติ 4 ใบ (ไม่มีรายการออเดอร์/โปร/สต็อกแบบเดิม)');
  ok((await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').count()) === 30, 'รายวัน: กราฟ 30 แท่ง');
  ok((await page.locator('nav[aria-label="ช่วงเวลา"] a[aria-current=page]').textContent()).trim() === 'รายวัน', 'แท็บรายวัน active');
  const revenueText = await page.locator('main h2:has-text("ยอดขาย")').locator('xpath=ancestor::div[contains(@class,"rounded-card")]').locator('p.text-2xl').first().textContent();
  ok(/^฿[\d,]+/.test(revenueText.trim()), `ยอดขาย 30 วัน = ${revenueText.trim()}`);
  ok((await page.locator('main h2:has-text("โปรโมชันกระตุ้นยอดขาย")').locator('xpath=ancestor::div[contains(@class,"rounded-card")]').locator('p.text-2xl').count()) === 0, 'การ์ดโปร: ไม่มีแถวสรุปรวมเหนือตาราง (พี่ต่อเอาออก)');
  ok((await page.locator('main table tbody tr').count()) >= 4, 'ตารางโปรโมชัน: มีโปรที่คาบเกี่ยว 30 วัน (กลางเดือน + 3 ตัวที่กำลังใช้)');
  const midMonth = page.locator('main table tbody tr', { hasText: 'ลด 10% ทั้งร้าน กลางเดือน' });
  ok((await midMonth.count()) === 1 && !/\b0\b/.test((await midMonth.locator('td').nth(1).textContent()).trim()), 'โปรกลางเดือนมีออเดอร์ที่ใช้ > 0');
  ok((await page.locator('main ol').first().locator('> li').count()) === 5, 'หมวดหมู่ขายดี: ค่าเริ่มต้น 5 อันดับ (seed มี 8 หมวด)');
  ok((await page.locator('main span:has-text("ขายดีสุด")').isVisible()) && (await page.locator('main span:has-text("ขายน้อยสุด")').count()) === 0, 'ป้ายขายดีสุดขึ้น · ขายน้อยสุดไม่ขึ้นเพราะตัดที่ 5 จาก 8 หมวด');
  ok((await page.locator('main ol').nth(1).locator('> li').count()) === 5, 'สินค้าขายดี: ค่าเริ่มต้น 5 อันดับ');
  await shot(page, 'p14-dashboard-day');

  // รูปเฟือง → เปลี่ยนจำนวนอันดับ (ปุ่มลัด + พิมพ์เอง) → หน้าโหลดข้อมูลตามค่าใหม่ + เก็บลง settings
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับสินค้า"]');
  await page.click('form[role=dialog] button:has-text("10")');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'สินค้าขายดี 10 อันดับ'));
  ok((await page.locator('main ol').nth(1).locator('> li').count()) === 10 && (await page.locator('form[role=dialog]').count()) === 0, 'เฟืองสินค้า: กด 10 → หัวข้อ+รายการเป็น 10 อันดับ ป๊อปอัปปิด');
  ok(JSON.parse(require('node:fs').readFileSync(`${DATA}/settings.json`, 'utf8')).dashboard.topProducts === 10, 'settings.json เก็บ topProducts = 10');
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับหมวดหมู่"]');
  await page.click('form[role=dialog] button:has-text("10")');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'หมวดหมู่ขายดี 10 อันดับ'));
  ok((await page.locator('main ol').first().locator('> li').count()) === 8 && (await page.locator('main span:has-text("ขายน้อยสุด")').isVisible()), 'เฟืองหมวดหมู่: 10 → แสดงครบ 8 หมวด ป้ายขายน้อยสุดขึ้น');
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับหมวดหมู่"]');
  await page.fill('form[role=dialog] input[name=value]', '3');
  await page.press('form[role=dialog] input[name=value]', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'หมวดหมู่ขายดี 3 อันดับ'));
  ok((await page.locator('main ol').first().locator('> li').count()) === 3, 'เฟืองหมวดหมู่: พิมพ์ 3 + Enter → 3 อันดับ');
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับหมวดหมู่"]');
  await page.fill('form[role=dialog] input[name=value]', '99');
  await page.press('form[role=dialog] input[name=value]', 'Enter');
  ok(await page.locator('form[role=dialog] [role=alert]').isVisible(), 'ค่านอกช่วง 1–50 → แจ้งเตือน ไม่บันทึก');
  await page.keyboard.press('Escape');
  ok((await page.locator('form[role=dialog]').count()) === 0, 'Esc ปิดป๊อปอัป');
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับโปรโมชัน"]');
  await page.fill('form[role=dialog] input[name=value]', '2');
  await page.press('form[role=dialog] input[name=value]', 'Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'โปรโมชันกระตุ้นยอดขาย 2 อันดับ'));
  ok((await page.locator('main table tbody tr').count()) === 2, 'เฟืองโปรโมชัน: พิมพ์ 2 → ตาราง 2 แถว');
  // คืนค่าเริ่มต้น 5 ให้เทสต์ถัดไป
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับโปรโมชัน"]');
  await page.click('form[role=dialog] button:has-text("5")');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'โปรโมชันกระตุ้นยอดขาย 5 อันดับ'));
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับหมวดหมู่"]');
  await page.click('form[role=dialog] button:has-text("5")');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'หมวดหมู่ขายดี 5 อันดับ'));
  await page.click('button[aria-label="ตั้งค่าจำนวนอันดับสินค้า"]');
  await page.click('form[role=dialog] button:has-text("5")');
  await page.waitForFunction(() => [...document.querySelectorAll('main h2')].some((h) => h.textContent.trim() === 'สินค้าขายดี 5 อันดับ'));

  // รายเดือน / รายปี
  await page.click('nav[aria-label="ช่วงเวลา"] a:has-text("รายเดือน")');
  await page.waitForURL(/range=month/);
  ok((await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').count()) === 12, 'รายเดือน: กราฟ 12 แท่ง');
  ok((await page.locator('main table tbody tr').count()) === 5 && (await page.locator('main table tbody tr', { hasText: 'SUMMER50' }).count()) === 1, 'รายเดือน: โปรในอดีต (SUMMER50) โผล่ในตาราง · ตัดที่ 5 อันดับ');
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
