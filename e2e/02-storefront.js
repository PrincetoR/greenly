const { BASE, launch, shot, ok, SHOT } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/`);
  ok((await page.locator('h2:has-text("สินค้าแนะนำ")').count()) === 1, 'home: featured section');
  // seed:clean ไม่มีออเดอร์ → ไม่มีอะไรให้จัดอันดับ ส่วน "สินค้าขายดี" ต้องซ่อน (ตรวจตอนมีข้อมูลใน e2e/14)
  ok((await page.locator('h2:has-text("สินค้าขายดี")').count()) === 0, 'home: ไม่มีออเดอร์ → ซ่อนสินค้าขายดี');
  // เส้นเขียว 2px ตรึงบนสุด + วิ่งตอนโหลดหน้า
  const topLine = await page.evaluate(() => { const el = document.querySelector('header')?.previousElementSibling?.previousElementSibling ?? document.querySelector('.fixed.top-0'); const r = el.getBoundingClientRect(); return { top: r.top, h: r.height, bg: getComputedStyle(el).backgroundColor }; });
  ok(topLine.top === 0 && topLine.h === 3 && topLine.bg === 'rgb(30, 138, 76)', `เส้นเขียว 3px ตรึงบนสุด (${JSON.stringify(topLine)})`);
  // รอ hydrate ก่อน (listener คลิกอยู่ฝั่ง client) · จับด้วย MutationObserver ก่อนคลิก — หน้า prefetch ไว้แล้วเปลี่ยนเร็วมาก แถบอาจโผล่แค่ไม่กี่เฟรม
  await page.waitForLoadState('networkidle');
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
  ok(nums.length === 30 && nums.every((n, i) => i === 0 || n >= nums[i - 1]), `sort price asc (${nums.slice(0, 4).join(',')}…)`);

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
  // แถบล่าง = [ย้อนกลับ] [หัวใจ] ไอคอน 48×48 · [ใส่ตะกร้า] เต็มที่เหลือ (พี่ต่อสั่ง 2026-09-16)
  const bar = await page.evaluate(() => [...document.querySelector('.fixed.bottom-0').querySelectorAll('button')].map((b) => ({ l: b.getAttribute('aria-label') || b.textContent.trim(), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height })));
  ok(bar.length === 3 && bar[0].l === 'ย้อนกลับ' && bar[1].l.includes('รายการโปรด') && bar[2].l === 'ใส่ตะกร้า' && bar[0].w === 48 && bar[1].w === 48 && bar[2].w > 200 && bar.every((b) => b.h === 48), `mobile bar: ${bar.map((b) => b.l).join(' · ')}`);
  ok((await page.locator('nav[aria-label="เมนูมือถือ"]').count()) === 0, 'mobile: หน้าสินค้าไม่มีแถบเมนูล่าง (แถบใส่ตะกร้าแทน)');
  // หน้าสินค้าแบบ Shopee (พี่ต่อสั่ง 2026-09-15): ไม่มี breadcrumb · รูปเต็มความกว้างจอ ปัดดูได้ (snap) · ปุ่มย้อนกลับลอยมุมซ้ายบนของรูป · ตัวนับ 1/3
  const pd = await page.evaluate(() => {
    const g = document.querySelector('[aria-roledescription=carousel]');
    const r = g.getBoundingClientRect();
    // มี 2 ปุ่ม (จอใหญ่ซ่อน) — เอาตัวที่มองเห็น
    const back = [...document.querySelectorAll('button[aria-label="ย้อนกลับ"]')].find((el) => el.getBoundingClientRect().width > 0);
    const b = back.getBoundingClientRect();
    return { breadcrumb: !!document.querySelector('nav[aria-label=breadcrumb]'), left: r.left, width: r.width, imgs: g.children.length, snap: getComputedStyle(g).scrollSnapType, counter: document.querySelector('[aria-live=polite]')?.textContent, backVisible: b.width > 0 && b.left < 24 && b.top > r.top && b.top < r.top + 24, backOnImage: b.top >= r.top };
  });
  ok(!pd.breadcrumb && pd.left === 0 && pd.width === 375, 'mobile: ไม่มี breadcrumb · รูปเต็มความกว้างจอ');
  ok(pd.imgs === 3 && pd.snap.startsWith('x') && pd.counter === '1/3' && pd.backVisible, `mobile: ปัดดูรูปได้ ${pd.imgs} รูป · ตัวนับ ${pd.counter} · ปุ่มย้อนกลับมุมซ้ายบนของรูป`);
  await page.locator('[aria-roledescription=carousel]').evaluate((g) => g.scrollTo({ left: g.clientWidth, behavior: 'instant' }));
  await page.waitForTimeout(200);
  ok((await page.locator('[aria-live=polite]').textContent()) === '2/3', 'mobile: ปัดไปรูปที่ 2 → ตัวนับ 2/3');
  await page.screenshot({ path: SHOT + '/p3-mobile-product.png', caret: 'initial' });
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  // แถบเมนูล่างมือถือ: ไอคอนล้วน 5 ปุ่ม · ค้นหาตรงกลางเป็นวงกลมนูนเหนือเส้นครึ่งวง (พี่ต่อสั่ง 2026-09-15)
  const tab = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="เมนูมือถือ"]');
    const r = nav.getBoundingClientRect();
    const items = [...nav.querySelectorAll('a,button')].map((el) => ({ label: el.getAttribute('aria-label'), text: el.textContent.trim(), current: el.getAttribute('aria-current'), r: el.getBoundingClientRect() }));
    const search = items.find((i) => i.label === 'ค้นหา');
    const footer = document.querySelector('footer').getBoundingClientRect();
    return { bottom: r.bottom, top: r.top, h: r.height, items, protrude: r.top - search.r.top, circle: search.r.width === search.r.height, centered: Math.abs(search.r.left + search.r.width / 2 - innerWidth / 2), footerBottom: footer.bottom, scrollH: document.documentElement.scrollHeight, vh: innerHeight };
  });
  ok(tab.bottom === 800 && tab.h === 56 && tab.items.map((i) => i.label).join('|') === 'หน้าแรก|สินค้าทั้งหมด|ค้นหา|โปรโมชัน|โปรไฟล์' && tab.items.every((i) => i.text === ''), 'mobile: แถบเมนูล่าง 5 ปุ่ม ไอคอนล้วน ติดล่างสุด');
  // วงกลม 64 โผล่พ้นแถบ 40% (26px) ไอคอน 28 · พื้นแถบเจาะรูรอบวงกลม (mask) ให้ดูลอย — พี่ต่อสั่ง 2026-09-15
  const srch = tab.items.find((i) => i.label === 'ค้นหา');
  const maskOk = await page.evaluate(() => getComputedStyle(document.querySelector('nav[aria-label="เมนูมือถือ"] .tabbar-bg')).maskImage.includes('radial-gradient'));
  ok(tab.protrude === 26 && srch.r.width === 64 && tab.circle && tab.centered < 0.5 && maskOk, `mobile: ปุ่มค้นหาวงกลม 64 กลางจอ โผล่พ้นเส้น ${tab.protrude}px (40%) · พื้นแถบเจาะรูรอบวงกลม`);
  ok((await page.locator('nav[aria-label="เมนูมือถือ"] button[aria-label="ค้นหา"] svg').evaluate((s) => s.getBoundingClientRect().width)) === 28, 'mobile: ไอคอนค้นหา 28px');
  ok(tab.items[0].current === 'page' && tab.items[1].current === null, 'mobile: หน้าแรก active');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.querySelector('footer').getBoundingClientRect().bottom)) <= 800 - 56 + 0.5, 'mobile: เลื่อนสุดแล้ว footer ไม่ถูกแถบเมนูทับ');
  await page.screenshot({ path: SHOT + '/p3-mobile-tabbar.png', caret: 'initial' });
  // ค้นหาทั้งเว็บ (พี่ต่อสั่ง 2026-09-15): ปุ่มค้นหา → /search มีแค่ header + ช่องค้นหา (ไม่มี footer · ไม่มีลูกศรย้อนกลับ · แถบล่างยังอยู่) · พิมพ์แล้วโชว์ โปรโมชัน ก่อน สินค้า แยกหัวเรื่อง
  await page.click('nav[aria-label="เมนูมือถือ"] button[aria-label="ค้นหา"]');
  await page.waitForURL(/\/search$/);
  await page.waitForLoadState('networkidle');
  ok((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'ค้นหาทั้งเว็บ' && (await page.locator('nav[aria-label="เมนูมือถือ"]').isVisible()) && (await page.locator('main button[aria-label="ย้อนกลับ"]').count()) === 0 && !(await page.locator('footer').isVisible()) && (await page.locator('main h2').count()) === 0, 'mobile: /search = header + ช่องค้นหาเปล่า โฟกัสแล้ว · แถบล่างยังอยู่ · ไม่มีลูกศรย้อนกลับ/footer');
  await page.keyboard.type('ลด');
  await page.waitForURL(/q=/);
  await page.waitForLoadState('networkidle');
  const heads = await page.locator('main h2').allTextContents();
  ok(heads.length === 2 && heads[0].startsWith('โปรโมชัน') && heads[1].startsWith('สินค้า') && (await page.locator('main article').count()) >= 3 && (await page.locator('main .group:has(h3)').count()) >= 1, `search "ลด": ${heads.join(' → ')} (โปรก่อน แยกหัวเรื่อง)`);
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.type('zzzz');
  await page.waitForURL(/q=zzzz/);
  await page.waitForLoadState('networkidle');
  ok((await page.locator('text=ไม่พบ "zzzz"').count()) === 1, 'search ไม่เจอ → ข้อความไม่พบ');
  await page.goto(`${BASE}/`);
  // มือถือหน้าร้าน: header มีแค่ตะกร้า ไม่มี hamburger (นำทางด้วยแถบเมนูล่าง) — พี่ต่อสั่ง 2026-09-15
  ok((await page.locator('header a[href="/cart"]').isVisible()) && !(await page.locator('button[aria-label="เปิดเมนู"]').isVisible()), 'mobile: header หน้าร้าน = ตะกร้าอย่างเดียว ไม่มี hamburger');
  await page.screenshot({ path: SHOT + '/p3-mobile-home.png', caret: 'initial' });

  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
