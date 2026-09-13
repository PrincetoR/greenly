const { BASE, launch, login, shot, ok, DATA, SHOT } = require('./lib');
const fs = require('fs');
const readPromos = () => JSON.parse(fs.readFileSync(DATA + '/promotions.json', 'utf8'));

(async () => {
  const { browser, page } = await launch();
  await login(page, 'admin');

  // list page: seed statuses
  await page.goto(`${BASE}/admin/promotions`);
  const pills = await page.locator('li span:has-text("กำลังใช้งาน")').count();
  ok(pills === 3, `list: 3 live promos (found ${pills})`);
  ok((await page.locator('li span:has-text("ยังไม่เริ่ม")').count()) === 1, 'list: 1 scheduled');
  ok((await page.locator('li span:has-text("หมดเวลา")').count()) === 3, 'list: 3 ended (กลางเดือน + SUMMER50 + ครบรอบร้าน)');
  ok(await page.locator('text=โค้ด SAVE100').first().isVisible(), 'list: coupon summary sentence');
  await shot(page, 'p4-promotions-list');

  // ---- create discount promo with limits ----
  await page.goto(`${BASE}/admin/promotions/new`);
  await page.click('[role=radio]:has-text("ลดราคา")');
  await page.fill('#name', 'E2E ลด 15% ธัญพืช');
  await page.click('button:has-text("เริ่มตอนนี้")');
  await page.click('button:has-text("7 วัน")');
  await page.click('[role=radiogroup] [role=radio]:has-text("เลือกหมวดหมู่")');
  await page.click('label:has-text("ธัญพืชและถั่ว")');
  await page.fill('#discountValue', '15');
  ok((await page.locator('text=ตัวอย่าง >> xpath=..').locator('.line-through').count()) === 1, 'live price example shown');
  // limits: enable per-product 3 and per-customer 2
  const switches = page.locator('input[role=switch]');
  const n = await switches.count();
  ok(n >= 4, `switches rendered (${n})`);
  await page.locator('input[role=switch][aria-label="จำกัดจำนวนชิ้นต่อสินค้า"]').check({ force: true });
  await page.fill('input[name=limitPerProductQty]', '3');
  await page.locator('input[role=switch][aria-label="จำกัดต่อลูกค้า 1 คน"]').check({ force: true });
  await page.fill('input[name=limitPerCustomer]', '2');
  const summary = await page.textContent('.fixed.bottom-0 p.line-clamp-2');
  ok(summary.includes('ลด 15%') && summary.includes('ธัญพืชและถั่ว') && summary.includes('3 ชิ้น/สินค้า') && summary.includes('2 ครั้ง/ลูกค้า'), `summary sentence: ${summary}`);
  ok(await page.locator('section span:has-text("กำลังใช้งาน")').first().isVisible(), 'status pill live in form');
  await shot(page, 'p4-form-discount');
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForURL(/\/admin\/promotions\?saved=1/);
  let created = readPromos().find((p) => p.name === 'E2E ลด 15% ธัญพืช');
  ok(created && created.type === 'discount' && created.discount.value === 15 && created.scope.kind === 'categories' && created.scope.ids[0] === 'c-grains', 'discount promo stored');
  ok(created.limits.perProductQty === 3 && created.limits.perCustomer === 2 && created.limits.totalUses === null, 'limits stored (null = ไม่จำกัด)');

  // ---- create coupon: validation then success ----
  await page.goto(`${BASE}/admin/promotions/new`);
  await page.click('[role=radio]:has-text("คูปองโค้ด")');
  await page.fill('#name', 'E2E คูปอง');
  await page.fill('#couponCode', 'save100'); // duplicate (lowercase → uppercased)
  await page.fill('#discountValue', '150');
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('ไม่เกิน 100'), 'percent > 100 rejected');
  await page.click(`[role=radio]:text-is("บาท")`);
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForFunction(() => document.querySelector('form p[role=alert]')?.textContent?.includes('ถูกใช้กับโปร'));
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('ถูกใช้กับโปร'), 'duplicate coupon code rejected');
  ok((await page.inputValue('#name')) === 'E2E คูปอง', 'form state kept after server error');
  await page.click('button:has-text("สุ่ม")');
  const code = await page.inputValue('#couponCode');
  ok(/^[A-Z0-9]{8}$/.test(code), `random code ${code}`);
  await page.fill('#couponMinSubtotal', '300');
  await page.locator('input[role=switch][aria-label="ส่งฟรี"]').check({ force: true });
  await page.locator('input[role=switch][aria-label="จำกัดสิทธิ์รวมทั้งโปร"]').check({ force: true });
  await page.fill('input[name=limitTotalUses]', '5');
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForURL(/\/admin\/promotions\?saved=1/);
  created = readPromos().find((p) => p.name === 'E2E คูปอง');
  ok(created && created.coupon.code === code && created.coupon.minSubtotal === 30000 && created.coupon.freeShipping === true && created.discount.value === 15000 && created.limits.totalUses === 5, 'coupon stored (บาท→สตางค์, ส่งฟรี, quota)');

  // ---- create bogo with product scope + validation of dates ----
  await page.goto(`${BASE}/admin/promotions/new`);
  await page.click('[role=radio]:has-text("ซื้อ X แถม Y")');
  await page.fill('#name', 'E2E ซื้อ 3 แถม 1');
  await page.click('[role=radiogroup] [role=radio]:has-text("เลือกสินค้า")');
  await page.fill('input[aria-label="ค้นหาสินค้า"]', 'สาหร่าย');
  await page.click('label:has-text("สาหร่ายอบกรอบ") input[type=checkbox]');
  ok((await page.textContent('text=เลือกแล้ว')).includes('1'), 'product picker selected 1');
  await page.fill('#bogoBuy', '3');
  await page.fill('#bogoGet', '1');
  // end before start → server error
  await page.fill('#endsAt', '2020-01-01T00:00');
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('หลังเวลาเริ่ม'), 'end < start rejected');
  await page.click('button:has-text("30 วัน")');
  await shot(page, 'p4-form-bogo');
  await page.click('button:has-text("สร้างโปรโมชัน")');
  await page.waitForURL(/\/admin\/promotions\?saved=1/);
  created = readPromos().find((p) => p.name === 'E2E ซื้อ 3 แถม 1');
  ok(created && created.bogo.buyQty === 3 && created.bogo.getQty === 1 && created.scope.kind === 'products' && created.scope.ids.length === 1 && created.discount === null, 'bogo stored');

  // ---- edit: form prefilled, toggle, duplicate ----
  await page.goto(`${BASE}/admin/promotions/${created.id}`);
  ok((await page.inputValue('#bogoBuy')) === '3' && (await page.inputValue('#name')) === 'E2E ซื้อ 3 แถม 1', 'edit form prefilled');
  ok(await page.locator('[role=radio][aria-checked=true]:has-text("ซื้อ X แถม Y")').isVisible(), 'type card preselected');
  await page.fill('#name', 'E2E ซื้อ 3 แถม 1 (แก้)');
  await page.click('button:has-text("บันทึกการแก้ไข")');
  await page.waitForURL(/saved=1/);
  ok(readPromos().find((p) => p.id === created.id).name === 'E2E ซื้อ 3 แถม 1 (แก้)', 'edit saved');
  const row = page.locator('li', { hasText: 'E2E ซื้อ 3 แถม 1 (แก้)' });
  await row.locator('button:has-text("ปิดใช้งาน")').click();
  await page.waitForLoadState('networkidle');
  ok(readPromos().find((p) => p.id === created.id).active === false, 'toggle off');
  ok(await page.locator('li', { hasText: 'E2E ซื้อ 3 แถม 1 (แก้)' }).locator('span:has-text("ปิดใช้งาน")').first().isVisible(), 'status pill inactive');
  await page.locator('li', { hasText: 'E2E ลด 15% ธัญพืช' }).locator('button:has-text("ทำสำเนา")').click();
  await page.waitForURL(/\/admin\/promotions\/promo-/);
  ok((await page.inputValue('#name')).includes('(สำเนา)'), 'duplicate opens copy in edit form');

  // status filter
  await page.goto(`${BASE}/admin/promotions?status=scheduled`);
  ok((await page.locator('ul[aria-label="รายการโปรโมชัน"] > li').count()) === 1, 'filter scheduled → 1');

  // mobile form
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/admin/promotions/new`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 375, `mobile form no h-scroll (${sw})`);
  ok(await page.locator('.fixed.bottom-0 button:has-text("สร้างโปรโมชัน")').isVisible(), 'mobile sticky save bar');
  await page.screenshot({ path: SHOT + '/p4-mobile-form.png', fullPage: true, caret: 'initial' });

  // cleanup: delete E2E promos
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const p of readPromos().filter((p) => p.name.startsWith('E2E'))) {
    await page.goto(`${BASE}/admin/promotions/${p.id}`);
    page.once('dialog', (d) => d.accept());
    await page.click('button:has-text("ลบ")');
    await page.waitForURL(/\/admin\/promotions$/);
  }
  ok(readPromos().length === 7, 'cleanup: back to 7 seed promos');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
