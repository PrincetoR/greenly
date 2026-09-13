// หมวดหมู่: จอใหญ่ = card แถบข้าง · มือถือ = dropdown · ไม่มี chip/tag แล้ว
const { BASE, launch, ok, shot } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/products`);
  ok(await page.locator('main aside nav a:has-text("ธัญพืชและถั่ว")').isVisible(), 'desktop: aside แสดงหมวดหมู่');
  // sticky: เลื่อนแล้ว card หมวดหมู่ + แถวค้นหา อยู่ที่เดิม การ์ดมุดใต้
  const before = await page.evaluate(() => ({ aside: document.querySelector('main aside nav').getBoundingClientRect().top, tb: document.querySelector('main input[aria-label="ค้นหา"]').getBoundingClientRect().top }));
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ aside: document.querySelector('main aside nav').getBoundingClientRect().top, tb: document.querySelector('main input[aria-label="ค้นหา"]').getBoundingClientRect().top, card: document.querySelector('main .group').getBoundingClientRect().top }));
  // ตอนอยู่นิ่งมีแถบสถานะ 32px อยู่บน (เลื่อนไปกับหน้า) → ตอนติดจะอยู่ใต้ header พอดี (65 + 16 = 81)
  ok(after.aside === 81 && after.tb === 81 && after.card < 0, `เลื่อนแล้ว aside/แถบค้นหาติดใต้ header (${before.tb} → ${after.tb}) การ์ดเลื่อนไป`);
  await page.mouse.wheel(0, -800);
  await page.waitForTimeout(300);
  ok((await page.locator('main a.rounded-full').count()) === 0, 'desktop: ไม่มี chip/tag');
  ok(!(await page.locator('main select[aria-label="หมวดหมู่"]').isVisible()), 'desktop: ซ่อน dropdown หมวด');
  ok((await page.textContent('main aside nav p')).trim() === 'หมวดหมู่สินค้า', 'บรรทัดแรกของ card = หมวดหมู่สินค้า');
  ok(await page.locator('main h1:has-text("สินค้าทั้งหมด")').isVisible(), 'หัวข้อ "สินค้าทั้งหมด" อยู่ในแถวเดียวกับค้นหา/เรียงลำดับ');
  const h1Box = await page.locator('main h1').boundingBox();
  const sortBox = await page.locator('main button[aria-haspopup=listbox]').boundingBox();
  ok(Math.abs(h1Box.y + h1Box.height / 2 - (sortBox.y + sortBox.height / 2)) <= 1, 'หัวข้อกับปุ่มเรียงลำดับอยู่แถวเดียวกัน');
  const searchBox = await page.locator('main input[aria-label="ค้นหา"]').boundingBox();
  ok(searchBox.x + searchBox.width < sortBox.x && sortBox.x - (searchBox.x + searchBox.width) <= 12, 'ช่องค้นหาติดกับเรียงลำดับ');
  // ค้นหา = ขอบซ้ายการ์ด 3 → กึ่งกลางการ์ด 4 · เรียงลำดับ = ครึ่งหลังการ์ด 4
  const row = (await page.locator('main .group').evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect()))).slice(0, 4);
  ok(Math.abs(searchBox.x - row[2].x) < 0.5, `ขอบซ้ายช่องค้นหา = ขอบซ้ายการ์ด 3 (${searchBox.x} = ${row[2].x})`);
  ok(await page.locator('main button[aria-haspopup=listbox]').evaluate((b) => [...b.querySelectorAll('span span')].every((s) => s.scrollWidth <= s.clientWidth + 1)), 'ข้อความเรียงลำดับไม่ถูกตัด (ปุ่มกว้างตามข้อความยาวสุด)');
  ok(Math.abs(sortBox.x + sortBox.width - (row[3].x + row[3].width)) < 0.5, 'ขอบขวาเรียงลำดับ = ขอบขวาการ์ด 4');
  const headerBottom = await page.locator('header').evaluate((h) => h.getBoundingClientRect().bottom);
  ok((await page.locator('main aside nav').boundingBox()).y - headerBottom === 16, 'ระยะ header → เนื้อหา 16px');
  const pill = await page.locator('header nav[aria-label="เมนูหลัก"] a[href="/products"]').boundingBox();
  const cardBox = await page.locator('main aside nav').boundingBox();
  ok(Math.abs(pill.x + pill.width - (cardBox.x + cardBox.width)) < 0.5, `ขอบขวาเมนู "สินค้าทั้งหมด" ตรงกับขอบขวา card หมวดหมู่ (${pill.x + pill.width} = ${cardBox.x + cardBox.width})`);
  ok(await page.locator('header a[href="/"] span.truncate').evaluate((s) => s.scrollWidth <= s.clientWidth), 'ชื่อร้านใน header ไม่ถูกตัด');
  const promoTextLeft = await page.locator('header nav[aria-label="เมนูหลัก"] a[href="/promotions"]').evaluate((a) => { const r = document.createRange(); r.selectNodeContents(a); return r.getBoundingClientRect().left; });
  const firstCard = await page.locator('main .group').first().boundingBox();
  ok(Math.abs(promoTextLeft - firstCard.x) < 0.5, `ข้อความ "โปรโมชัน" เริ่มตรงขอบซ้ายการ์ดสินค้า (${promoTextLeft} = ${firstCard.x})`);
  const nav = await page.locator('main aside nav').boundingBox();
  const input = await page.locator('main input[aria-label="ค้นหา"]').boundingBox();
  ok(nav.y === input.y, `ขอบบน card หมวดหมู่ตรงกับช่องค้นหา (${nav.y} = ${input.y})`);
  const line = await page.locator('main aside nav div[aria-hidden]').boundingBox();
  ok(line.y === input.y + input.height, `เส้นคั่นอยู่ระดับขอบล่างช่องค้นหา (${line.y} = ${input.y + input.height})`);
  const firstItem = await page.locator('main aside nav ul a').first().boundingBox();
  const firstCardBox = await page.locator('main .group').first().boundingBox();
  ok(firstItem.y === firstCardBox.y, `"ทั้งหมด" ขอบบนตรงการ์ดสินค้า (${firstItem.y} = ${firstCardBox.y})`);
  await page.goto(`${BASE}/products?q=อบ`);
  ok(await page.locator('main h1:has-text("ผลการค้นหา")').isVisible(), 'หน้าผลค้นหายังมีหัวข้อบอกบริบท');
  await page.goto(`${BASE}/products`);
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
