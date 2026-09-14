// กวาดทุกหน้าใน 3 ขนาดจอ: ไม่มี h-scroll, ไม่มี console error, มี h1 · ถ่ายรูปไว้ดู
const { BASE, launch, login, ok, SHOT } = require('./lib');
const fs = require('fs');
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));

const SHOP = ['/', '/products', '/products?q=มะม่วง', '/category/ธัญพืชและถั่ว', '/product/เมล็ดเจีย-500-กรัม-p-006', '/promotions', '/cart', '/nope-404'];
const ADMIN = ['/admin', '/admin/products', '/admin/products/new', '/admin/products/p-001', '/admin/categories', '/admin/promotions', '/admin/promotions/new', '/admin/promotions/promo-save100', '/admin/orders', '/admin/shipping', '/admin/shipping?tab=settings', '/admin/payments', '/admin/payments?tab=settings', '/admin/users', '/admin/settings', '/admin/login'];

(async () => {
  const { browser, page } = await launch();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) { errors.push(page.url() + ' :: ' + m.text().slice(0, 120)); const lines = m.text().split('\n'); const idx = lines.findIndex(l => /^\s*[+-]\s/.test(l)); console.log('HYDRATION @', page.url(), '\n', lines.slice(Math.max(0, idx - 8), idx + 10).join('\n')); } });

  for (const vp of [375, 768, 1280]) {
    await page.setViewportSize({ width: vp, height: 900 });
    await page.context().clearCookies();
    for (const path of SHOP) {
      await page.goto(BASE + path);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      const h1 = await page.locator('h1').count();
      ok(sw <= vp && h1 >= 1, `${vp}px ${path} (sw=${sw}, h1=${h1})`);
      if (vp === 375 || vp === 1280) await page.screenshot({ path: `${SHOT}/p8-${vp}${path.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true, caret: 'initial' });
    }
    await login(page, 'admin');
    for (const path of ADMIN) {
      await page.goto(BASE + path);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      // แดชบอร์ดไม่มี h1 (พี่ต่อเอาออก) — ใช้ card KPI เป็นสัญญาณว่าหน้าโหลด · /admin/login ตอน login แล้วจะเด้งมาแดชบอร์ด
      const isDash = page.url().replace(/\/$/, '').endsWith('/admin');
      const h1 = isDash ? await page.locator('main .grid a, main .grid div[class*="rounded-card"]').count() : await page.locator('h1').count();
      ok(sw <= vp && h1 >= 1, `${vp}px ${path} (sw=${sw}, ${isDash ? 'kpi' : 'h1'}=${h1})`);
      if (vp === 375) await page.screenshot({ path: `${SHOT}/p8-${vp}${path.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true, caret: 'initial' });
    }
  }
  ok(errors.length === 0, `no console errors (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
