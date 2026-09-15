/**
 * บัญชีลูกค้า (role customer — พี่ต่อสั่ง 2026-09-15): login จากหน้าโปรไฟล์แบบเลื่อนบานในหน้าเดียว (header/แถบล่างอยู่ที่เดิม)
 * ลูกค้า: login แล้วอยู่โปรไฟล์ · ปุ่มออกจากระบบล่างสุดของโปรไฟล์ → หน้าแรก · เข้าหลังบ้านไม่ได้ · พนักงาน: login ทางเดียวกัน → การจัดการ (พี่ต่อสั่ง 2026-09-15)
 */
const { BASE, launch, ok, shot } = require('./lib');

(async () => {
  const { browser, page } = await launch({ width: 375, height: 800 });
  await page.goto(`${BASE}/account`);
  await page.waitForLoadState('networkidle');
  ok((await page.locator('h1').textContent()) === 'ลูกค้าทั่วไป' && (await page.locator('section:first-child button:has-text("เข้าสู่ระบบ")').isVisible()), 'guest: โปรไฟล์มีปุ่มเข้าสู่ระบบ');
  ok((await page.locator('main form button:has-text("ออกจากระบบ")').count()) === 0, 'guest: ไม่มีปุ่มออกจากระบบ');

  // กดแล้วเลื่อนไปทางซ้าย — URL เดิม header/แถบล่างอยู่ครบ
  const before = await page.locator('h1').evaluate((h) => h.getBoundingClientRect().left);
  await page.click('section:first-child button:has-text("เข้าสู่ระบบ")');
  await page.waitForTimeout(450);
  const slid = await page.evaluate(() => {
    const track = document.querySelector('.overflow-hidden > div');
    return { translate: getComputedStyle(track).translate, h1Left: document.querySelector('h1').getBoundingClientRect().left, form: !!document.querySelector('form #username'), focused: document.activeElement?.id, scrollLeft: track.parentElement.scrollLeft };
  });
  ok(page.url().endsWith('/account') && slid.translate === '-50%' && slid.h1Left < before - 300 && slid.scrollLeft === 0, `กดเข้าสู่ระบบ → เลื่อนบานไปซ้าย (translate ${slid.translate}) URL เดิม`);
  ok(slid.form && slid.focused === 'username' && (await page.locator('header').isVisible()) && (await page.locator('nav[aria-label="เมนูมือถือ"]').isVisible()), 'ฟอร์ม login โผล่ + โฟกัสชื่อผู้ใช้ · header/แถบล่างอยู่ที่เดิม');
  await shot(page, 'p16-account-login-slide');

  // login ผิด → error ในบานเดิม
  await page.fill('#username', 'customer');
  await page.fill('#password', 'wrong');
  await page.click('form button[type=submit]:has-text("เข้าสู่ระบบ")');
  await page.waitForSelector('form [role=alert]');
  ok((await page.textContent('form [role=alert]')).includes('ไม่ถูกต้อง') && page.url().endsWith('/account'), 'รหัสผิด → แจ้งในบาน login ไม่เปลี่ยนหน้า');

  // login ลูกค้า → โปรไฟล์ชื่อบัญชี + ออกจากระบบล่างสุด
  await page.fill('#password', 'customer1234');
  await page.click('form button[type=submit]:has-text("เข้าสู่ระบบ")');
  await page.waitForSelector('main form button:has-text("ออกจากระบบ")');
  await page.waitForLoadState('networkidle');
  ok((await page.locator('h1').textContent()) === 'สมชาย ใจดี' && (await page.locator('text=ลูกค้า · customer').count()) === 1, 'ลูกค้า login แล้ว: ชื่อบัญชี + role');
  const bottom = await page.evaluate(() => {
    const btn = document.querySelector('main form button');
    const main = document.querySelector('main');
    const all = [...main.querySelectorAll('a,button')].filter((el) => el.getBoundingClientRect().height > 0 && !el.closest('[inert]'));
    return { last: all[all.length - 1] === btn, text: btn.textContent.trim() };
  });
  ok(bottom.last && bottom.text === 'ออกจากระบบ', 'ลูกค้า: ปุ่มออกจากระบบอยู่ล่างสุดของโปรไฟล์');
  ok((await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/account"][aria-current=page]').count()) === 1 && (await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"]').count()) === 0 && !(await page.locator('button[aria-label="เปิดเมนู"]').isVisible()), 'ลูกค้า: แถบล่างยังเป็นโปรไฟล์ · ไม่มีการจัดการ/hamburger');
  await page.goto(`${BASE}/admin`);
  ok(page.url().endsWith('/account'), 'ลูกค้าเข้า /admin → เด้งกลับโปรไฟล์');
  await page.goto(`${BASE}/admin/products`);
  ok(page.url().endsWith('/account'), 'ลูกค้าเข้า /admin/products → เด้งกลับโปรไฟล์');
  await shot(page, 'p16-account-customer');
  await page.click('main form button:has-text("ออกจากระบบ")');
  await page.waitForURL((u) => u.pathname === '/');
  await page.goto(`${BASE}/account`);
  ok((await page.locator('h1').textContent()) === 'ลูกค้าทั่วไป' && (await page.locator('section:first-child button:has-text("เข้าสู่ระบบ")').isVisible()), 'ออกจากระบบ → หน้าแรก · โปรไฟล์กลับเป็น guest');

  // พนักงาน login ทางเดียวกัน → ไปหน้าการจัดการ · โปรไฟล์ของพนักงานมีลิงก์การจัดการ ไม่มีปุ่มออกจากระบบ (อยู่ใน hamburger หลังบ้าน)
  await page.click('section:first-child button:has-text("เข้าสู่ระบบ")');
  await page.waitForTimeout(400);
  await page.fill('#username', 'staff');
  await page.fill('#password', 'staff1234');
  await page.click('form button[type=submit]:has-text("เข้าสู่ระบบ")');
  await page.waitForURL((u) => u.pathname === '/admin');
  ok(true, 'พนักงาน login จากโปรไฟล์ → หน้าการจัดการ');
  await page.goto(`${BASE}/account`);
  await page.waitForLoadState('networkidle');
  ok((await page.locator('a:has-text("ไปหน้าการจัดการ")').isVisible()) && (await page.locator('main form button:has-text("ออกจากระบบ")').count()) === 1 && (await page.locator('nav[aria-label="เมนูมือถือ"] a[href="/admin"]').count()) === 1, 'โปรไฟล์พนักงาน: ลิงก์การจัดการ + ปุ่มออกจากระบบ · แถบล่างเป็นการจัดการ');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
