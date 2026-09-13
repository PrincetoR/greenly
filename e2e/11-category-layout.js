// หมวดหมู่: จอใหญ่ = card แถบข้าง · มือถือ = dropdown · ไม่มี chip/tag แล้ว
const { BASE, launch, ok, shot } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/products`);
  ok(await page.locator('main aside nav a:has-text("ธัญพืชและถั่ว")').isVisible(), 'desktop: aside แสดงหมวดหมู่');
  ok((await page.locator('main a.rounded-full').count()) === 0, 'desktop: ไม่มี chip/tag');
  ok(!(await page.locator('main select[aria-label="หมวดหมู่"]').isVisible()), 'desktop: ซ่อน dropdown หมวด');
  ok((await page.textContent('main aside nav p')).trim() === 'หมวดหมู่สินค้า', 'บรรทัดแรกของ card = หมวดหมู่สินค้า');
  const head = await page.locator('main aside nav p').boundingBox();
  const h1 = await page.locator('main h1').boundingBox();
  ok(head.y <= h1.y && head.y + head.height === h1.y + h1.height, `หัว card ระดับเดียวกับหัวข้อหน้า (ฐาน ${head.y + head.height} = ${h1.y + h1.height})`);
  const first = await page.locator('main aside nav ul a').first().boundingBox();
  const input = await page.locator('main input[name=q]').boundingBox();
  ok(first.y === input.y, `"ทั้งหมด" ขอบบนตรงกับช่องค้นหา (${first.y} = ${input.y})`);
  ok((await page.locator('main h1').boundingBox()).x === input.x, 'หัวข้อหน้าอยู่เหนือช่องค้นหา (ขอบซ้ายตรงกัน)');
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
