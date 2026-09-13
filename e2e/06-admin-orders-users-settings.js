const { BASE, launch, login, shot, ok, DATA, SHOT } = require('./lib');
const fs = require('fs');
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));
const KOMBUCHA = '/product/คอมบูชารสขิงมะนาว-330-มล-p-003';
const GRANOLA = '/product/กราโนล่าน้ำผึ้งอัลมอนด์-300-กรัม-p-009';

async function placeOrder(page, path, qty, phone, coupon) {
  await page.context().clearCookies();
  await page.goto(BASE + path);
  await page.waitForLoadState('networkidle');
  // ปุ่มใส่ทีละ 1 ชิ้น (ไม่มีช่องจำนวนแล้ว) → กดซ้ำตามจำนวน รอ badge ตะกร้าเพิ่มทุกครั้ง
  const badge = () => page.evaluate(() => Number(document.querySelector('header a[title="ตะกร้า"] span')?.textContent ?? 0));
  for (let i = 0; i < qty; i++) {
    const before = await badge();
    await page.click('button:has-text("ใส่ตะกร้า"):visible');
    await page.waitForFunction((b) => Number(document.querySelector('header a[title="ตะกร้า"] span')?.textContent ?? 0) > b, before);
  }
  if (coupon) {
    await page.goto(`${BASE}/cart`);
    await page.fill('input[name=code]', coupon);
    await page.click('button:has-text("ใช้โค้ด")');
    await page.waitForSelector(`text=ใช้คูปอง ${coupon}`);
  }
  await page.goto(`${BASE}/checkout`);
  await page.fill('#name', 'ลูกค้า ทดสอบ');
  await page.fill('#phone', phone);
  await page.fill('#address', '99 หมู่ 1 ต.ในเมือง อ.เมือง จ.เชียงใหม่ 50000');
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
  await page.waitForURL(/\/order\/OD-/);
  return new URL(page.url()).pathname.split('/').pop();
}

(async () => {
  const { browser, page } = await launch();
  const granolaStock = read('products').find((p) => p.id === 'p-009').stock;
  const noA = await placeOrder(page, KOMBUCHA, 7, '0811111111', 'SAVE100'); // 665-95-100+50 = 520
  const noB = await placeOrder(page, GRANOLA, 2, '0822222222'); // 378 + gift, +50 = 428
  const orders = read('orders');
  const A = orders.find((o) => o.orderNo === noA);
  const B = orders.find((o) => o.orderNo === noB);
  ok(A.total === 52000 && B.total === 42800, `orders placed A=${A.total} B=${B.total}`);
  ok(read('products').find((p) => p.id === 'p-009').stock === granolaStock - 3, 'granola stock -3 (2 + gift)');

  // staff manages orders
  await login(page, 'staff', 'staff1234');
  await page.goto(`${BASE}/admin/orders`);
  ok((await page.locator('tbody tr').count()) === 2, 'orders list: 2 rows');
  ok((await page.textContent('a:has-text("รอชำระ/ยืนยัน")')).includes('(2)'), 'pending count chip 2');
  await page.fill('input[name=q]', '0822222222');
  await page.press('input[name=q]', 'Enter');
  await page.waitForURL(/q=0822222222/);
  ok((await page.locator('tbody tr').count()) === 1, 'search by phone → 1');
  await shot(page, 'p7-orders');

  // status flow A: pending → paid → shipped → done
  await page.goto(`${BASE}/admin/orders/${A.id}`);
  ok(await page.locator('button:text-is("ชำระแล้ว")').isVisible() && await page.locator('button:has-text("ยกเลิกคำสั่งซื้อ")').isVisible(), 'pending: next = paid / cancel');
  ok(await page.locator('text=คูปอง SAVE100').first().isVisible(), 'detail shows coupon');
  ok((await page.locator('span:has-text("ลด 20% เครื่องดื่มสุขภาพ")').count()) >= 1, 'detail shows promo usage badges');
  await shot(page, 'p7-order-detail');
  await page.click('button:text-is("ชำระแล้ว")');
  await page.waitForSelector('button:text-is("จัดส่งแล้ว")');
  ok(true, 'paid: next = shipped');
  await page.click('button:text-is("จัดส่งแล้ว")');
  await page.waitForSelector('button:text-is("สำเร็จ")');
  await page.click('button:text-is("สำเร็จ")');
  await page.waitForSelector('text=สถานะสุดท้ายแล้ว');
  ok(read('orders').find((o) => o.id === A.id).status === 'done', 'A → done');

  // cancel B → stock + usage restored
  await page.goto(`${BASE}/admin/orders/${B.id}`);
  page.once('dialog', (d) => d.accept());
  await page.click('button:has-text("ยกเลิกคำสั่งซื้อ")');
  await page.waitForSelector('text=สถานะสุดท้ายแล้ว');
  ok(read('orders').find((o) => o.id === B.id).status === 'cancelled', 'B cancelled');
  ok(read('products').find((p) => p.id === 'p-009').stock === granolaStock, 'granola stock restored');
  // customer sees status on order page
  await page.goto(`${BASE}/order/${noB}`);
  ok(await page.locator('text=ยกเลิก').first().isVisible(), 'customer order page shows cancelled');

  // staff cannot open users/settings
  await page.goto(`${BASE}/admin/users`);
  ok(new URL(page.url()).pathname === '/admin/forbidden', 'staff → /admin/users forbidden');

  // admin: promotions usage after cancel, dashboard KPIs
  await page.context().clearCookies();
  await login(page, 'admin');
  await page.goto(`${BASE}/admin/promotions`);
  ok((await page.locator('li', { hasText: 'ซื้อ 2 แถม 1' }).textContent()).includes('ใช้ไป 0'), 'bogo usage back to 0 after cancel');
  ok((await page.locator('li', { hasText: 'SAVE100' }).textContent()).includes('1/50'), 'coupon usage 1/50');
  await page.goto(`${BASE}/admin`);
  const kpi = await page.locator('.grid > a, .grid > div').allTextContents();
  ok(kpi.some((t) => t.includes('ยอดขายวันนี้') && t.includes('฿520') && t.includes('1 ออเดอร์')), `dashboard revenue today ฿520 (1 order, cancelled excluded)`);
  ok(kpi.some((t) => t.includes('รอยืนยัน') && /0/.test(t)), 'dashboard pending 0');
  ok(kpi.some((t) => t.includes('โปรที่กำลังใช้งาน') && t.includes('3')), 'dashboard live promos 3');
  // แดชบอร์ดไม่มีรายการออเดอร์ล่าสุดแล้ว (เป็นสถิติแทน) — ออเดอร์วันนี้ 2 ใบ (1 ยกเลิก) อยู่ในกราฟรายวัน
  ok((await page.locator('h2:has-text("ออเดอร์ล่าสุด")').count()) === 0 && (await page.locator('ul[aria-label="ยอดขายต่อช่วง"] > li').last().getAttribute('title')).includes('฿520'), 'dashboard: กราฟรายวัน แท่งวันนี้ = ฿520');
  await shot(page, 'p7-dashboard');

  // users
  await page.goto(`${BASE}/admin/users`);
  ok(await page.locator('li', { hasText: '@admin' }).locator('button:has-text("ปิดใช้งาน")').isDisabled(), 'cannot disable self');
  await page.fill('#u-username', 'Staff2');
  await page.fill('#u-name', 'พนักงานสอง');
  await page.fill('#u-password', 'short');
  await page.click('button:has-text("เพิ่มผู้ใช้")');
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('8 ตัว'), 'password too short error');
  ok((await page.inputValue('#u-name')) === 'พนักงานสอง', 'add-user values kept');
  await page.fill('#u-password', 'staff2pass');
  await page.click('button:has-text("เพิ่มผู้ใช้")');
  await page.waitForURL(/saved=1/);
  ok(read('users').some((u) => u.username === 'staff2' && u.role === 'staff'), 'user added (username lowercased)');
  // reset password + toggle
  const row = page.locator('li', { hasText: '@staff2' });
  await row.locator('input[name=password]').fill('newpass123');
  await row.locator('button:has-text("ตั้งรหัสใหม่")').click();
  await row.locator('text=เปลี่ยนรหัสผ่านแล้ว').waitFor();
  ok(true, 'password reset');
  await row.locator('button:has-text("ปิดใช้งาน")').click();
  await page.waitForLoadState('networkidle');
  ok(read('users').find((u) => u.username === 'staff2').active === false, 'user deactivated');
  await shot(page, 'p7-users');
  // deactivated user cannot login; reactivate and login with new password
  await page.context().clearCookies();
  await page.goto(`${BASE}/admin/login`);
  await page.fill('#username', 'staff2'); await page.fill('#password', 'newpass123'); await page.click('button[type=submit]');
  await page.waitForSelector('form [role=alert]');
  ok((await page.textContent('form [role=alert]')).includes('ปิดใช้งาน'), 'deactivated login blocked');
  await login(page, 'admin');
  await page.goto(`${BASE}/admin/users`);
  await page.locator('li', { hasText: '@staff2' }).locator('button:has-text("เปิดใช้งาน")').click();
  await page.waitForLoadState('networkidle');
  await page.context().clearCookies();
  await login(page, 'staff2', 'newpass123');
  ok(new URL(page.url()).pathname === '/admin', 'login with reset password works');

  // settings
  await page.context().clearCookies();
  await login(page, 'admin');
  await page.goto(`${BASE}/admin/settings`);
  await page.fill('#shippingFee', 'abc');
  await page.click('button:has-text("บันทึกการตั้งค่า")');
  await page.waitForSelector('form p[role=alert]');
  ok((await page.textContent('form p[role=alert]')).includes('ค่าส่ง'), 'settings validation');
  await page.fill('#shippingFee', '60');
  await page.fill('#storeName', 'Greenly E2E');
  await page.click('button:has-text("บันทึกการตั้งค่า")');
  await page.waitForSelector('text=บันทึกการตั้งค่าแล้ว');
  ok(read('settings').shippingFee === 6000 && read('settings').storeName === 'Greenly E2E', 'settings saved (บาท→สตางค์)');
  await page.goto(`${BASE}/`);
  ok(await page.locator('header a:has-text("Greenly E2E")').isVisible(), 'storefront header uses new store name');
  // restore
  await page.goto(`${BASE}/admin/settings`);
  await page.fill('#shippingFee', '50'); await page.fill('#storeName', 'Greenly');
  await page.click('button:has-text("บันทึกการตั้งค่า")');
  await page.waitForSelector('text=บันทึกการตั้งค่าแล้ว');

  // mobile
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/admin', '/admin/orders', `/admin/orders/${A.id}`, '/admin/users', '/admin/settings']) {
    await page.goto(BASE + path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 375, `mobile no h-scroll ${path} (${sw})`);
  }
  await page.goto(`${BASE}/admin/orders`);
  ok((await page.locator('ul > li > a[href^="/admin/orders/"]').count()) === 2, 'mobile orders as cards');
  await page.screenshot({ path: SHOT + '/p7-mobile-dashboard.png', fullPage: true, caret: 'initial' });

  // cleanup users
  const users = read('users').filter((u) => u.username !== 'staff2');
  fs.writeFileSync(DATA + '/users.json', JSON.stringify(users, null, 2) + '\n');
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
