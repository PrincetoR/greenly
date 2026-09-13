// หมวดหมู่: จอใหญ่ = card แถบข้าง · มือถือ = dropdown · ไม่มี chip/tag แล้ว
const { BASE, launch, ok, shot } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/products`);
  ok(await page.locator('main aside nav a:has-text("ธัญพืชและถั่ว")').isVisible(), 'desktop: aside แสดงหมวดหมู่');
  ok((await page.locator('main a.rounded-full').count()) === 0, 'desktop: ไม่มี chip/tag');
  ok(!(await page.locator('main select[aria-label="หมวดหมู่"]').isVisible()), 'desktop: ซ่อน dropdown หมวด');
  const all = await page.locator('main aside nav > a').boundingBox();
  const input = await page.locator('main input[name=q]').boundingBox();
  const firstCat = await page.locator('main aside nav ul a').first().boundingBox();
  const card = await page.locator('main .group').first().boundingBox();
  ok(all.y === input.y && all.height === input.height, `"ทั้งหมด" ระดับเดียวกับช่องค้นหา (${all.y} = ${input.y})`);
  ok(firstCat.y === card.y, `หมวดแรกขอบบนตรงกับการ์ดสินค้า (${firstCat.y} = ${card.y})`);
  await shot(page, 'p12-aside');
  await page.click('main aside nav a:has-text("ธัญพืชและถั่ว")');
  await page.waitForURL(/\/category\//);
  ok((await page.getAttribute('main aside nav a[aria-current=page]', 'href')).includes('/category/'), 'เลือกหมวดจาก aside → active');
  ok((await page.locator('.group').count()) === 4, 'หมวดกรอง 4 สินค้า');

  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/products`);
  ok(!(await page.locator('main aside').isVisible()), 'มือถือ: ซ่อน aside');
  const sel = page.locator('main select[aria-label="หมวดหมู่"]');
  ok(await sel.isVisible(), 'มือถือ: dropdown หมวดหมู่');
  await sel.selectOption({ label: 'ขนมเพื่อสุขภาพ' });
  await page.waitForURL(/\/category\//);
  ok((await sel.evaluate((s) => s.options[s.selectedIndex].text)) === 'ขนมเพื่อสุขภาพ' && (await page.locator('.group').count()) === 4, 'มือถือ: เลือกหมวดจาก dropdown → กรอง');
  ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 375, 'มือถือไม่ล้น');
  await page.screenshot({ path: `${require('./lib').SHOT}/p12-mobile.png`, caret: 'initial' });
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
