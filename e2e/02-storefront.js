const { BASE, launch, shot, ok, SHOT } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/`);
  ok((await page.locator('h2:has-text("สินค้าแนะนำ")').count()) === 1, 'home: featured section');
  ok((await page.locator('a[href^="/category/"]').count()) >= 6, 'home: category chips');
  await shot(page, 'p3-home');

  // header search
  await page.fill('header input[type=search]', 'มะม่วง');
  await page.press('header input[type=search]', 'Enter');
  await page.waitForURL(/\/products\?q=/);
  ok((await page.locator('a[href^="/product/"]').count()) === 2, 'search "มะม่วง" → 2 results (ชื่อ + คำอธิบาย)');
  ok((await page.textContent('h1')).includes('มะม่วง'), 'search title shows term');

  // sort price asc
  await page.goto(`${BASE}/products?sort=price-asc`);
  // เรียงตามราคาตั้ง (ราคาเดิม) — การ์ดที่มีโปรจะโชว์ราคาเดิมแบบขีดฆ่า
  const nums = await page.locator('main .group').evaluateAll((cards) =>
    cards.map((c) => Number((c.querySelector('.line-through') ?? c.querySelector('span.font-bold')).textContent.replace(/[^\d.]/g, ''))),
  );
  ok(nums.length === 24 && nums.every((n, i) => i === 0 || n >= nums[i - 1]), `sort price asc (${nums.slice(0, 4).join(',')}…)`);

  // category page + chip active
  await page.click('main a[href^="/category/"]:has-text("ธัญพืชและถั่ว")');
  await page.waitForURL(/\/category\//);
  ok((await page.locator('a[href^="/product/"]').count()) === 4, 'category page → 4 products');
  ok((await page.getAttribute('main a[aria-current=page]', 'href')).startsWith('/category/'), 'active chip marked');
  // search within category keeps basePath
  await page.fill('main input[type=search]', 'เจีย'); // พิมพ์แล้วค้นทันที ไม่มีปุ่ม
  await page.waitForURL(/\/category\/.*\?q=/);
  ok((await page.locator('main button:has-text("ค้นหา")').count()) === 0, 'ไม่มีปุ่มค้นหา');
  ok(await page.locator('main input[type=search]').evaluate((i) => document.activeElement === i), 'พิมพ์ค้นหาแล้ว focus ยังอยู่ที่ช่อง');
  ok((await page.locator('a[href^="/product/"]').count()) === 1, 'search within category');

  // product detail
  await page.click('main a[href^="/product/"]');
  await page.waitForURL(/\/product\//);
  ok((await page.textContent('h1')).includes('เมล็ดเจีย'), 'product detail title');
  ok(await page.locator('text=฿220').first().isVisible(), 'price shown');
  ok((await page.locator('h2:has-text("สินค้าในหมวดเดียวกัน")').count()) === 1, 'related products');
  await shot(page, 'p3-product');

  // add to cart → badge
  await page.click('button[aria-label="เพิ่มจำนวน"] >> nth=0');
  await page.click('button:has-text("ใส่ตะกร้า") >> nth=0');
  await page.waitForSelector('[role=status]:has-text("ใส่ตะกร้าแล้ว")');
  ok(true, 'add to cart feedback');
  await page.waitForFunction(() => document.querySelector('a[href="/cart"] span')?.textContent === '2');
  ok(true, 'cart badge = 2');
  // qty clamp to stock: add 99 more of a product with stock 20
  await page.goto(`${BASE}/product/${encodeURIComponent('เครื่องชั่งอาหารดิจิทัล')}-p-018`);
  await page.fill('input[name=qty] >> nth=0', '99');
  ok((await page.inputValue('input[name=qty] >> nth=0')) === '20', 'qty input clamped to stock 20');

  // 404
  const res = await page.goto(`${BASE}/product/does-not-exist`);
  ok(res.status() === 404 && (await page.textContent('h1')).includes('ไม่พบ'), 'unknown product → 404 page');

  // mobile
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/', '/products', '/category/ธัญพืชและถั่ว', '/product/เมล็ดเจีย-500-กรัม-p-006']) {
    await page.goto(BASE + path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 375, `mobile no h-scroll ${path} (${sw})`);
  }
  ok(await page.locator('.fixed.bottom-0 button:has-text("ใส่ตะกร้า")').isVisible(), 'mobile sticky add-to-cart bar');
  await page.screenshot({ path: SHOT + '/p3-mobile-product.png', caret: 'initial' });
  await page.goto(`${BASE}/`);
  await page.click('button[aria-label="เปิดเมนู"]');
  ok(await page.locator('#mobile-menu a[href="/promotions"]').isVisible(), 'mobile drawer nav');
  await page.screenshot({ path: SHOT + '/p3-mobile-home-menu.png', caret: 'initial' });

  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
