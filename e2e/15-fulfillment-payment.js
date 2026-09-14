// ชำระผ่าน Beam (จำลอง) → คิวจัดส่ง (รอแพ็ค → แพ็ค → ส่ง เลขพัสดุ → ถึงมือ) · ตีกลับ · ใบปะหน้า · ลูกค้าติดตามพัสดุ · คืนเงิน · การชำระเงินหลังบ้าน
const { BASE, DATA, launch, login, shot, ok, pick } = require('./lib');
const fs = require('fs');
const read = (n) => JSON.parse(fs.readFileSync(`${DATA}/${n}.json`, 'utf8'));
const KOMBUCHA = '/product/คอมบูชารสขิงมะนาว-330-มล-p-003';

// กดปุ่มดำเนินการในหน้ารายละเอียด: เปิดหน้าใหม่ก่อน (URL ไม่มี updated=1) จะได้รอ redirect ได้จริง
async function act(page, id, selector, before) {
  await page.goto(`${BASE}/admin/orders/${id}`);
  if (before) await before();
  await page.click(selector);
  await page.waitForURL(/updated=1/);
}

async function checkout(page, method, clear = true) {
  if (clear) await page.context().clearCookies();
  await page.goto(`${BASE}${KOMBUCHA}`);
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("ใส่ตะกร้า"):visible');
  await page.waitForFunction(() => document.querySelector('header a[title="ตะกร้า"] span'));
  await page.goto(`${BASE}/checkout`);
  await page.fill('#name', 'ลูกค้า บีม');
  await page.fill('#phone', '0899999999');
  await page.fill('#address', '77 ถ.ทดสอบ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200');
  await page.click(`label:has-text("${method}")`);
  await page.click('button[type=submit]:has-text("ยืนยันสั่งซื้อ")');
}

(async () => {
  const { browser, page } = await launch();

  // ---- ลูกค้า: ชำระผ่าน Beam ----
  await checkout(page, 'ชำระออนไลน์');
  await page.waitForURL(/\/pay\/pay-/);
  // หน้าชำระเงิน "ของแอป" — ใช้ header ร้าน ไม่มีคำว่า Beam ให้ลูกค้าเห็น (พี่ต่อสั่ง 2026-09-15)
  ok((await page.locator('h1:has-text("เลือกวิธีชำระเงิน")').isVisible()) && (await page.locator('header a[href="/cart"]').count()) === 1 && !(await page.evaluate(() => document.body.innerText)).includes('Beam'), 'ไปหน้าชำระเงินของแอปหลังยืนยันสั่งซื้อ (header ร้าน · ไม่มีคำว่า Beam)');
  const tabs = await page.locator('[role=tab]').allTextContents();
  ok(tabs.length >= 6 && tabs.some((t) => t.includes('PromptPay')) && tabs.some((t) => t.includes('บัตรเครดิต')) && tabs.some((t) => t.includes('Mobile Banking')), `ช่องทาง Beam: ${tabs.length} ช่อง`);
  ok(!tabs.some((t) => t.includes('ผ่อน')), 'ยอดต่ำกว่า 3,000 → ไม่มีผ่อนชำระ');
  ok(await page.locator('svg[aria-label="QR จำลอง"]').isVisible(), 'PromptPay แสดง QR');
  await page.click('[role=tab]:has-text("บัตรเครดิต")');
  ok(await page.locator('input[aria-label="หมายเลขบัตร (จำลอง)"]').isVisible(), 'บัตร: ฟอร์มบัตร');
  await shot(page, 'p15-pay-card');
  // มือถือ: accordion — รายละเอียดกางใต้แถวที่เลือก · แถบ [ยอด · ชำระเงิน] ติดล่างจอ · ไม่ล้นจอ (พี่ต่อขอให้ใช้ง่ายขึ้น)
  const payUrl = page.url();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(payUrl);
  await page.waitForLoadState('networkidle');
  await page.click('[role=tab]:has-text("Mobile Banking")');
  await page.waitForTimeout(200);
  const mob = await page.evaluate(() => {
    const tab = [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent.includes('Mobile Banking'));
    const panel = tab.parentElement.querySelector('[role=tabpanel]');
    const bar = document.querySelector('.fixed.bottom-0');
    return { panelUnderTab: panel && panel.getBoundingClientRect().top >= tab.getBoundingClientRect().bottom, radios: panel?.querySelectorAll('input[type=radio]').length, bar: bar && bar.getBoundingClientRect().bottom === 800 && bar.textContent.includes('ชำระเงิน'), sw: document.documentElement.scrollWidth };
  });
  ok(mob.panelUnderTab && mob.radios >= 5 && mob.bar && mob.sw <= 375, `มือถือ: accordion ใต้แถว (ธนาคาร ${mob.radios}) · แถบชำระติดล่าง · ไม่ล้นจอ`);
  await shot(page, 'p15-pay-mobile');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(payUrl);
  await page.waitForLoadState('networkidle');
  let orders = read('orders');
  const o1 = orders[orders.length - 1];
  ok(o1.status === 'pending' && o1.paymentMethod === 'beam' && o1.payment.status === 'pending' && read('payments').some((p) => p.orderId === o1.id), 'ออเดอร์รอชำระ + payment pending ใน ledger');

  // จำลองไม่สำเร็จก่อน
  await page.click('button:has-text("จำลอง: ชำระไม่สำเร็จ")');
  await page.waitForURL(/\/order\/OD-.*failed=1/);
  ok(await page.locator('text=ชำระเงินไม่สำเร็จ').isVisible() && (await page.locator('button:has-text("ชำระเงินตอนนี้")').isVisible()), 'ไม่สำเร็จ → หน้าออเดอร์แจ้ง + ปุ่มชำระใหม่');
  ok(read('orders').find((o) => o.id === o1.id).status === 'pending', 'ออเดอร์ยัง pending');
  // ชำระใหม่ → สำเร็จ
  await page.click('button:has-text("ชำระเงินตอนนี้")');
  await page.waitForURL(/\/pay\/pay-/);
  await page.click('[role=tab]:has-text("Mobile Banking")');
  await page.click('label:has-text("SCB Easy")');
  await page.click('button:has-text("ชำระเงิน ฿")');
  await page.waitForURL(/\/order\/OD-.*paid=1/);
  ok(await page.locator('text=ชำระเงินสำเร็จ').isVisible(), 'สำเร็จ → กลับหน้าออเดอร์');
  const paidOrder = read('orders').find((o) => o.id === o1.id);
  ok(paidOrder.status === 'paid' && paidOrder.payment.status === 'succeeded' && paidOrder.payment.channel === 'mobile_banking' && paidOrder.payment.fee > 0, `ออเดอร์ → รอแพ็ค · payment succeeded (fee ${paidOrder.payment.fee})`);
  ok(read('payments').filter((p) => p.orderId === o1.id).length === 2 && paidOrder.history.some((h) => h.type === 'paid'), 'ledger มี 2 รายการ (failed + succeeded) · history บันทึกชำระ');
  ok((await page.locator('ol[aria-label="ขั้นตอนคำสั่งซื้อ"] [aria-current=step]').textContent()).trim() === '2', 'stepper ลูกค้าอยู่ขั้น 2 (รอแพ็ค)');
  await shot(page, 'p15-customer-paid');

  // ---- ลูกค้า: COD ----
  await checkout(page, 'เก็บเงินปลายทาง', false); // guest เดิม → ลูกค้าเห็นทั้ง 2 ออเดอร์
  await page.waitForURL(/\/order\/OD-.*new=1/);
  orders = read('orders');
  const o2 = orders[orders.length - 1];
  ok(o2.paymentMethod === 'cod' && o2.payment.provider === 'cod' && o2.status === 'pending', 'COD: ออเดอร์ pending รอร้านยืนยัน');

  // ---- หลังบ้าน: คิวจัดส่ง ----
  await login(page, 'staff', 'staff1234');
  const menu = await page.locator('main aside nav ul a').allTextContents();
  ok(menu.map((t) => t.trim()).includes('จัดส่ง') && !menu.map((t) => t.trim()).includes('การชำระเงิน'), 'staff เห็นเมนูจัดส่ง แต่ไม่เห็นการชำระเงิน');
  await page.goto(`${BASE}/admin/shipping`);
  ok((await page.locator('tbody tr').count()) === 1 && (await page.locator('tbody tr').textContent()).includes(o1.orderNo), 'รอแพ็ค: มีออเดอร์ Beam ที่ชำระแล้ว 1 ใบ');
  // เลือกทั้งหมด → เริ่มแพ็ค
  await page.check('input[aria-label="เลือกทั้งหมด"]');
  await page.click('button:has-text("เริ่มแพ็คที่เลือก (1)")');
  await page.waitForURL(/tab=packing/);
  ok(read('orders').find((o) => o.id === o1.id).status === 'packing', 'bulk เริ่มแพ็ค → packing');
  // ใบปะหน้า
  await page.goto(`${BASE}/admin/shipping/labels?ids=${o1.id},${o2.id}`);
  ok((await page.locator('article[aria-label^="ใบปะหน้า"]').count()) === 2 && (await page.locator('text=ลูกค้า บีม').count()) === 2 && (await page.locator('text=เก็บเงินปลายทาง').count()) === 1, 'ใบปะหน้า 2 ใบ (COD 1 ใบ) ไม่มี header หลังบ้าน');
  ok((await page.locator('header').count()) === 0, 'หน้าพิมพ์ไม่มี header');
  await shot(page, 'p15-labels');
  // จัดส่ง: ต้องมีเลขพัสดุ
  await page.goto(`${BASE}/admin/orders/${o1.id}`);
  await page.fill('input[name=trackingNo]', 'x');
  await page.click('button:has-text("จัดส่ง")');
  await page.waitForURL(/error=tracking/);
  ok(await page.locator('text=กรุณาเลือกขนส่งและกรอกเลขพัสดุ').isVisible(), 'เลขพัสดุสั้นเกิน → แจ้งเตือน');
  await act(page, o1.id, 'button:has-text("จัดส่ง")', async () => {
    await pick(page, '[role=combobox][aria-label="ขนส่ง"]', 'Flash Express');
    await page.fill('input[name=trackingNo]', 'th1234567890123');
    await page.fill('input[name=weightGrams]', '450');
  });
  const shipped = read('orders').find((o) => o.id === o1.id);
  ok(shipped.status === 'shipped' && shipped.shipment.carrier === 'flash' && shipped.shipment.trackingNo === 'TH1234567890123' && shipped.shipment.weightGrams === 450, 'จัดส่ง → shipped + shipment (เลขพัสดุเป็นตัวพิมพ์ใหญ่)');
  ok(await page.locator('a[href*="flashexpress.com"]').first().isVisible(), 'ลิงก์ไปเว็บขนส่ง');
  ok((await page.locator('text=ร้านค้าสร้างรายการจัดส่ง').count()) >= 1, 'ไทม์ไลน์พัสดุ (จำลอง) เริ่มแล้ว');
  await shot(page, 'p15-admin-shipped');
  // ถึงมือลูกค้า
  await act(page, o1.id, 'button:has-text("ถึงมือลูกค้าแล้ว")');
  ok(read('orders').find((o) => o.id === o1.id).status === 'done' && (await page.locator('text=สถานะสุดท้ายแล้ว').isVisible()), 'done · สถานะสุดท้าย');

  // COD: ยืนยัน → แพ็ค → ส่ง → ตีกลับ → ส่งใหม่
  await act(page, o2.id, 'button:has-text("ยืนยันรับออเดอร์")');
  await act(page, o2.id, 'button:has-text("เริ่มแพ็ค")');
  await act(page, o2.id, 'button:has-text("จัดส่ง")', () => page.fill('input[name=trackingNo]', 'KEX0000000001'));
  await act(page, o2.id, 'button:has-text("พัสดุตีกลับ")', () => pick(page, '[role=combobox][aria-label="เหตุผลตีกลับ"]', 'ที่อยู่ไม่ชัดเจน'));
  let r = read('orders').find((o) => o.id === o2.id);
  ok(r.status === 'returned' && r.shipment.returnReason === 'ที่อยู่ไม่ชัดเจน', 'ตีกลับพร้อมเหตุผล');
  await page.goto(`${BASE}/admin/shipping?tab=returned`);
  ok((await page.locator('tbody tr', { hasText: o2.orderNo }).count()) === 1, 'คิวตีกลับมีออเดอร์นี้');
  await act(page, o2.id, 'button:has-text("ส่งใหม่ (เริ่มแพ็ค)")');
  r = read('orders').find((o) => o.id === o2.id);
  ok(r.status === 'packing' && r.history.length >= 6, `ส่งใหม่ → packing · history ${r.history.length} รายการ`);

  // ---- ลูกค้าเห็นการติดตาม + คืนเงิน ----
  // guest cookie ยังอยู่ (login หลังบ้านไม่ล้าง) → ลูกค้าดู o1 ได้
  await page.goto(`${BASE}/order/${o1.orderNo}`);
  ok(await page.locator('h2:has-text("ติดตามพัสดุ")').isVisible() && (await page.locator('text=จัดส่งสำเร็จ ผู้รับเซ็นรับแล้ว').isVisible()), 'ลูกค้า: ไทม์ไลน์พัสดุ + จัดส่งสำเร็จ');
  await shot(page, 'p15-customer-tracking');

  // ---- admin: การชำระเงิน + คืนเงิน ----
  await page.context().clearCookies();
  await login(page, 'admin', 'admin1234');
  await page.goto(`${BASE}/admin/payments`);
  ok((await page.locator('main h2').allTextContents()).some((t) => t.includes('สัดส่วนช่องทาง')), 'หน้าการชำระเงิน: ภาพรวม');
  await page.goto(`${BASE}/admin/payments?tab=transactions`);
  ok((await page.locator('tbody tr').count()) === 2, 'ledger: 2 รายการ (failed + succeeded)');
  await page.goto(`${BASE}/admin/orders/${o1.id}`);
  await page.fill('input[aria-label="ยอดคืน"]', '20');
  await page.fill('input[aria-label="เหตุผลคืนเงิน"]', 'สินค้าบุบ');
  await page.click('button:has-text("คืนเงิน")');
  await page.waitForURL(/refunded=1/);
  const refunded = read('orders').find((o) => o.id === o1.id);
  ok(refunded.payment.status === 'partially_refunded' && refunded.payment.refundedAmount === 2000, 'คืนเงินบางส่วน 20 บาท');
  await page.goto(`${BASE}/admin/payments?tab=settings`);
  ok((await page.locator('input[name^="channel:"]').count()) >= 10, 'ตั้งค่า Beam: ช่องทางครบ 10');
  await page.uncheck('input[name="channel:linepay"]');
  await page.click('button:has-text("บันทึกการตั้งค่า")');
  await page.waitForURL(/saved=1/);
  ok(read('settings').payments.beam.channels.linepay === false, 'ปิด LINE Pay บันทึกลง settings');
  await shot(page, 'p15-payments-settings');

  // ---- มือถือ ----
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/admin/shipping', `/admin/orders/${o1.id}`, '/admin/payments', `/order/${o1.orderNo}`]) {
    await page.goto(BASE + path);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 375, `มือถือไม่มี scroll ข้าง ${path} (${sw})`);
  }
  await browser.close();
})().catch((e) => { console.error('💥', e); process.exit(1); });
