const { BASE, launch, login, shot, ok, pick, DATA, PUBLIC, UPLOAD_TMP } = require('./lib');
const fs = require('fs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(UPLOAD_TMP, png);
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));

(async () => {
  const { browser, page } = await launch();
  // login flow จริง
  await login(page, 'admin');
  ok(new URL(page.url()).pathname === '/admin', `login admin → ${page.url()}`);
  ok(await page.locator('text=ผู้ดูแลระบบ').first().isVisible(), 'dashboard shows role');
  await shot(page, 'p2-dashboard');

  // wrong password
  await page.context().clearCookies();
  await page.goto(`${BASE}/admin/login`);
  await page.fill('#username', 'admin'); await page.fill('#password', 'wrong');
  await page.click('button[type=submit]');
  await page.waitForSelector('form [role=alert]');
  ok((await page.textContent('form [role=alert]')).includes('ไม่ถูกต้อง'), 'wrong password shows error');

  await login(page, 'admin');

  // categories: add
  await page.goto(`${BASE}/admin/categories`);
  await page.fill('#cat-name', 'ทดสอบหมวด');
  ok((await page.inputValue('#cat-slug')) === 'ทดสอบหมวด', 'slug auto from name');
  await page.click('button[role=radio][title="ของขวัญ"]');
  await page.click('button:has-text("เพิ่มหมวดหมู่")');
  await page.waitForLoadState('networkidle');
  ok(await page.locator('td:has-text("ทดสอบหมวด")').first().isVisible(), 'category added appears in table');
  ok(read('categories').find((c) => c.name === 'ทดสอบหมวด').icon === 'gift', 'category icon saved (gift)');
  // categories: edit
  const row = page.locator('tr', { hasText: 'ทดสอบหมวด' });
  await row.locator('a:has-text("แก้ไข")').click();
  await page.waitForURL(/edit=/);
  ok(await page.locator('button[role=radio][title="ของขวัญ"][aria-checked=true]').isVisible(), 'edit form: icon preselected');
  await page.fill('#cat-name', 'ทดสอบหมวด 2');
  await page.setInputFiles('input[type=file]', UPLOAD_TMP);
  await page.waitForSelector('input[type=hidden][name=image]', { state: 'attached' });
  await page.click('button:has-text("บันทึกการแก้ไข")');
  await page.waitForURL(/\/admin\/categories$/);
  ok(await page.locator('td:has-text("ทดสอบหมวด 2")').first().isVisible(), 'category edited');
  const catImg = read('categories').find((c) => c.name === 'ทดสอบหมวด 2').image;
  ok(typeof catImg === 'string' && catImg.startsWith('/uploads/'), `category image uploaded (${catImg})`);
  // หน้าแรก: การ์ดหมวดใช้รูปที่อัปโหลด
  await page.goto(`${BASE}/`);
  // หน้าแรกมี 2 ลิสต์ (มือถือแบบเลื่อนข้าง + จอใหญ่ grid) — นับเฉพาะที่มองเห็น
  ok((await page.locator(`main a[href="/category/ทดสอบหมวด"]:visible img[src="${catImg}"]`).count()) === 1, 'home: category card shows uploaded image');
  ok((await page.locator('main h2:has-text("หมวดหมู่")').locator('xpath=ancestor::section').locator('a[href^="/category/"]:visible').count()) === 9, 'home: 9 category cards');
  await page.goto(`${BASE}/admin/categories`);
  await shot(page, 'p2-categories');

  // products: create with upload
  await page.goto(`${BASE}/admin/products/new`);
  await page.fill('#name', 'สินค้าทดสอบ E2E');
  await page.fill('#sku', 'SKU-E2E');
  await page.fill('#price', '1,234.50');
  await page.fill('#stock', '7');
  await pick(page, '#categoryId', 'ทดสอบหมวด 2');
  await page.fill('#description', 'คำอธิบายทดสอบ');
  await page.setInputFiles('input[type=file]', UPLOAD_TMP);
  await page.waitForSelector('input[name=images]', { state: 'attached' });
  const imgPath = await page.getAttribute('input[name=images]', 'value');
  ok(imgPath && imgPath.startsWith('/uploads/'), `image uploaded → ${imgPath}`);
  ok(fs.existsSync(PUBLIC + imgPath), 'uploaded file exists on disk');
  await shot(page, 'p2-product-form');
  await page.click('button:has-text("เพิ่มสินค้า")');
  await page.waitForURL(/\/admin\/products\?saved=1/);
  ok(await page.locator('text=สินค้าทดสอบ E2E').first().isVisible(), 'product appears in list');
  const products = JSON.parse(fs.readFileSync(DATA + '/products.json', 'utf8'));
  const created = products.find((p) => p.sku === 'SKU-E2E');
  ok(created && created.price === 123450, `price stored as satang = ${created?.price}`);
  ok(created && created.images[0] === imgPath, 'image path stored');

  // validation error: duplicate slug
  await page.goto(`${BASE}/admin/products/new`);
  await page.fill('#name', 'อีกชิ้น'); await page.fill('#sku', 'SKU-X'); await page.fill('#price', '10'); await page.fill('#stock', '1');
  await page.fill('#slug', created.slug);
  await page.click('#categoryId');
  await page.locator('[role=listbox] [role=option]').first().click();
  await page.click('button:has-text("เพิ่มสินค้า")');
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('slug'), 'duplicate slug error shown under field');

  // toggle active + delete
  await page.goto(`${BASE}/admin/products?q=SKU-E2E`);
  await page.locator('tr', { hasText: 'SKU-E2E' }).locator('button:has-text("ปิดขาย")').click();
  await page.waitForLoadState('networkidle');
  ok(await page.locator('tr', { hasText: 'SKU-E2E' }).locator('text=ปิดขาย').first().isVisible(), 'toggle active works');
  await page.goto(`${BASE}/admin/products/${created.id}`);
  page.once('dialog', (d) => d.accept());
  await page.click('button:has-text("ลบสินค้า")');
  await page.waitForURL(/\/admin\/products$/);
  ok(!(await page.locator('text=SKU-E2E').count()), 'product deleted');

  // delete category (now empty)
  await page.goto(`${BASE}/admin/categories`);
  page.once('dialog', (d) => d.accept());
  await page.locator('tr', { hasText: 'ทดสอบหมวด 2' }).locator('button:has-text("ลบ")').click();
  await page.waitForLoadState('networkidle');
  ok(!(await page.locator('td:has-text("ทดสอบหมวด 2")').count()), 'category deleted');
  // delete category in use → warning
  page.once('dialog', (d) => d.accept());
  const busy = page.locator('tr', { hasText: 'เครื่องดื่มสุขภาพ' }).locator('button:has-text("ลบ")');
  ok(await busy.isDisabled(), 'delete disabled for category in use');

  // staff cannot see promotions menu, but can reach products
  await page.context().clearCookies();
  await login(page, 'staff', 'staff1234');
  ok(!(await page.locator('nav a[href="/admin/promotions"]').count()), 'staff: no promotions menu');
  await page.goto(`${BASE}/admin/products`);
  ok(page.url().endsWith('/admin/products'), 'staff can open products');

  // mobile shell
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/admin/products`);
  // มือถือหลังบ้าน: hamburger อย่างเดียว ไม่มีตะกร้า (พี่ต่อสั่ง 2026-09-15)
  ok(!(await page.locator('header a[href="/cart"]').isVisible()) && (await page.locator('button[aria-label="เปิดเมนู"]').isVisible()), 'mobile admin: hamburger อย่างเดียว ไม่มีตะกร้า');
  ok((await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"][aria-current=page]').isVisible()) && (await page.locator('nav[aria-label="เมนูมือถือ"] a').count()) === 4, 'mobile admin: มีแถบเมนูล่าง · การจัดการ active');
  await page.click('button[aria-label="เปิดเมนู"]');
  ok(await page.locator('#mobile-menu a[href="/admin/orders"]').isVisible(), 'mobile drawer opens with menu');
  // staff login → แถบเมนูล่างหน้าร้านช่องขวาสุดเป็น การจัดการ
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  ok((await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"][aria-label="การจัดการ"]').count()) === 1 && (await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/account"]').count()) === 0, 'mobile: staff เห็นแท็บ การจัดการ แทนโปรไฟล์');
  await page.goto(`${BASE}/admin/products`);
  await shot(page, 'p2-mobile-products');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 375, `no horizontal scroll on mobile (scrollWidth=${sw})`);

  fs.rmSync(PUBLIC + imgPath, { force: true });
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
