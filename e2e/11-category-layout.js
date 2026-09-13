// สลับรูปแบบหมวดหมู่ chips ↔ aside — จำใน cookie · มือถือเป็น chips เสมอ
const { BASE, launch, ok, shot } = require('./lib');
const { chromium } = require('playwright');

(async () => {
  let { browser, ctx, page } = await launch();
  await page.goto(`${BASE}/products`);
  ok((await page.locator('main aside').count()) === 0 && (await page.locator('main ul.scrollbar-none a:has-text("ทั้งหมด")').first().isVisible()), 'ค่าเริ่มต้น: chips ไม่มี aside');
  await page.click('button[aria-label="หมวดหมู่แบบแถบด้านข้าง"]');
  await page.waitForSelector('main aside');
  ok(await page.locator('main aside nav a:has-text("ธัญพืชและถั่ว")').isVisible(), 'สลับเป็น aside: มีแถบข้าง');
  ok(!(await page.locator('main ul.scrollbar-none a:has-text("ทั้งหมด")').first().isVisible()), 'aside: chips ซ่อนบน desktop');
  ok((await page.getAttribute('button[aria-label="หมวดหมู่แบบแถบด้านข้าง"]', 'aria-checked')) === 'true', 'toggle ติ๊กถูกที่ aside');
  await shot(page, 'p12-aside');
  // ผ่านหมวดจาก aside → active + ยังเป็น aside
  await page.click('main aside nav a:has-text("ธัญพืชและถั่ว")');
  await page.waitForURL(/\/category\//);
  ok((await page.getAttribute('main aside nav a[aria-current=page]', 'href')).includes('/category/'), 'เลือกหมวดจาก aside → active');
  ok((await page.locator('.group').count()) === 4, 'หมวดกรอง 4 สินค้า');
  // cookie จำได้หลังเปิดใหม่
  const state = await ctx.storageState();
  ok(state.cookies.some((c) => c.name === 'ec_catlayout' && c.value === 'aside'), 'cookie ec_catlayout=aside');
  await browser.close();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  ctx = await browser.newContext({ storageState: state, locale: 'th-TH' });
  page = await ctx.newPage();
  await page.goto(`${BASE}/products`);
  ok((await page.locator('main aside').count()) === 1, 'เปิดใหม่ยังเป็น aside');
  // มือถือ: chips เสมอ toggle ซ่อน
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/products`);
  ok(!(await page.locator('main aside').isVisible()) && (await page.locator('main ul.scrollbar-none a:has-text("ทั้งหมด")').first().isVisible()), 'มือถือ: chips เสมอ');
  ok(!(await page.locator('button[aria-label="หมวดหมู่แบบแถบด้านข้าง"]').isVisible()), 'มือถือ: ซ่อน toggle');
  ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375, 'มือถือไม่ล้น');
  // กลับเป็น chips
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/products`);
  await page.click('button[aria-label="หมวดหมู่แบบแถบด้านบน"]');
  await page.waitForSelector('main aside', { state: 'detached' });
  ok(await page.locator('main ul.scrollbar-none a:has-text("ทั้งหมด")').first().isVisible(), 'สลับกลับเป็น chips');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
