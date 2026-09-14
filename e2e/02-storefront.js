const { BASE, launch, shot, ok, SHOT } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/`);
  ok((await page.locator('h2:has-text("สินค้าแนะนำ")').count()) === 1, 'home: featured section');
  // seed:clean ไม่มีออเดอร์ → ไม่มีอะไรให้จัดอันดับ ส่วน "สินค้าขายดี" ต้องซ่อน (ตรวจตอนมีข้อมูลใน e2e/14)
  ok((await page.locator('h2:has-text("สินค้าขายดี")').count()) === 0, 'home: ไม่มีออเดอร์ → ซ่อนสินค้าขายดี');
  // เส้นเขียว 2px ตรึงบนสุด + วิ่งตอนโหลดหน้า
  const topLine = await page.evaluate(() => { const el = document.querySelector('header')?.previousElementSibling?.previousElementSibling ?? document.querySelector('.fixed.top-0'); const r = el.getBoundingClientRect(); return { top: r.top, h: r.height, bg: getComputedStyle(el).backgroundColor }; });
  ok(topLine.top === 0 && topLine.h === 2 && topLine.bg === 'rgb(30, 138, 76)', `เส้นเขียว 2px ตรึงบนสุด (${JSON.stringify(topLine)})`);
  // จับด้วย MutationObserver ก่อนคลิก — หน้า prefetch ไว้แล้วเปลี่ยนเร็วมาก แถบอาจโผล่แค่ไม่กี่เฟรม
  const shown = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 1500);
        const mo = new MutationObserver(() => {
          if (document.querySelector('.top-line-sweep')) {
            clearTimeout(timer);
            mo.disconnect();
            resolve(true);
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        document.querySelector('header a[href="/promotions"]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      }),
  );
  ok(shown, 'คลิกลิงก์ → แถบวิ่งบนเส้นเขียวขึ้นทันที');
  await page.waitForURL(/promotions/);
  await page.waitForTimeout(300);
  ok((await page.locator('.top-line-sweep').count()) === 0, 'หน้าใหม่มาแล้ว → แถบวิ่งหาย');
  await page.goto(`${BASE}/`);
  // snap ทีละกลุ่ม: เลื่อนล้อเมาส์แล้วหัวข้อกลุ่มต้องหยุดที่ 81 (ใต้ header 16)
  ok((await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)) === 'y mandatory', 'home: เปิด scroll snap');
  await page.mouse.wheel(0, 420);
  await page.waitForTimeout(700);
  const snapped = await page.evaluate(() => [...document.querySelectorAll('.snap-section')].map((s) => Math.round(s.getBoundingClientRect().top)));
  ok(snapped.includes(81), `home: เลื่อนแล้ว snap หัวข้อกลุ่มที่ 81 (${snapped.join(',')})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  ok((await page.locator('a[href^="/category/"]').count()) >= 6, 'home: category chips');
  await shot(page, 'p3-home');

  // ไม่มีช่องค้นหาใน header แล้ว — ค้นหาจากหน้ารายการ (พิมพ์แล้วมีผลทันที)
  ok((await page.locator('header input[type=search]').count()) === 0, 'header ไม่มีช่องค้นหา');
  await page.goto(`${BASE}/products`);
  await page.waitForLoadState('networkidle'); // รอ hydrate ก่อนพิมพ์ ไม่งั้น onChange ยังไม่ผูก
  await page.fill('main input[type=search]', 'มะม่วง');
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

  // add to cart (ทีละ 1 ไม่มีช่องจำนวน) → badge
  await page.waitForLoadState('networkidle');
  ok((await page.locator('input[name=qty]:visible').count()) === 0 && (await page.locator('button[aria-label="เพิ่มจำนวน"]').count()) === 0, 'ไม่มีตัวเลือกจำนวนในหน้าสินค้า');
  await page.click('button:has-text("ใส่ตะกร้า") >> nth=0');
  await page.waitForSelector('[role=status]:has-text("ใส่ตะกร้าแล้ว")');
  ok(true, 'add to cart feedback');
  await page.waitForFunction(() => document.querySelector('a[href="/cart"] span')?.textContent === '1');
  await page.click('button:has-text("ใส่ตะกร้า") >> nth=0');
  await page.waitForFunction(() => document.querySelector('a[href="/cart"] span')?.textContent === '2');
  ok(true, 'cart badge = 2 after 2 clicks');

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
