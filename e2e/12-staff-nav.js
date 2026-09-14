// เมนู "การจัดการ" ใน header หน้าร้าน โผล่เฉพาะเมื่อ login หลังบ้าน (admin/staff)
const { BASE, launch, login, ok } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/`);
  ok((await page.locator('header a[href="/admin"]').count()) === 0, 'ไม่ได้ login: ไม่มีเมนูการจัดการ');

  for (const [user, pass] of [['staff', 'staff1234'], ['admin', 'admin1234']]) {
    await page.context().clearCookies();
    await login(page, user, pass);
    await page.goto(`${BASE}/`);
    const items = await page.locator('header nav[aria-label="เมนูหลัก"] a:not([href="/"])').allTextContents();
    ok(JSON.stringify(items.map((t) => t.trim())) === JSON.stringify(['สินค้าทั้งหมด', 'โปรโมชัน', 'การจัดการ']), `${user}: เมนู ${items.join(' · ')}`);
    ok((await page.locator('nav[aria-label="แถบสถานะ"] a[href="/account"]').textContent()).trim() === user, `${user}: แถบสถานะแสดงชื่อ login`);
    await page.click('header nav[aria-label="เมนูหลัก"] a[href="/admin"]');
    await page.waitForURL(/\/admin$/);
    ok(await page.locator('main aside nav ul a[aria-current=page][href="/admin"]').isVisible(), `${user}: กดการจัดการ → แดชบอร์ด`);
  }

  // logout แล้วเมนูหาย
  await page.click('main button:has-text("ออกจากระบบ")');
  await page.waitForURL(/\/admin\/login/);
  await page.goto(`${BASE}/`);
  ok((await page.locator('header a[href="/admin"]').count()) === 0, 'logout แล้วเมนูการจัดการหาย');

  // มือถือ: staff login → แถบเมนูล่างช่องขวาสุดเป็น การจัดการ (แทนโปรไฟล์) · header หน้าร้านไม่มี hamburger (พี่ต่อสั่ง 2026-09-15)
  await login(page, 'staff', 'staff1234');
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/`);
  await page.waitForLoadState('networkidle');
  ok(!(await page.locator('button[aria-label="เปิดเมนู"]').isVisible()) && (await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"][aria-label="การจัดการ"]').isVisible()), 'มือถือ: staff เห็นแท็บ การจัดการ ที่แถบล่าง · ไม่มี hamburger หน้าร้าน');
  await page.click('nav[aria-label="เมนูมือถือ"] a[href="/admin"]');
  await page.waitForURL(/\/admin$/);
  ok((await page.locator('button[aria-label="เปิดเมนู"]').isVisible()) && !(await page.locator('header a[href="/cart"]').isVisible()), 'มือถือหลังบ้าน: hamburger อย่างเดียว ไม่มีตะกร้า');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
