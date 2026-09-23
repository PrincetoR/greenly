/** บทความ: เมนูหน้าร้าน · รายการ/หน้าอ่าน · ค้นหาเจอ · หลังบ้านสร้าง-แก้-เผยแพร่ */
const { BASE, launch, login, shot, ok } = require('./lib');

(async () => {
  const { browser, page } = await launch();
  try {
    /* ---------- หน้าร้าน ---------- */
    await page.goto(BASE);
    const navArticles = page.locator('header nav a[href="/articles"]');
    ok(await navArticles.count() === 1, 'header มีเมนู "บทความ"');
    ok((await navArticles.textContent())?.trim() === 'บทความ', 'ชื่อเมนูถูกต้อง');

    await navArticles.click();
    await page.waitForURL('**/articles');
    ok((await page.locator('main h1').textContent()) === 'บทความทั้งหมด', 'หัวข้อ = บทความทั้งหมด');

    const cards = page.locator('main article');
    const count = await cards.count();
    // seed: 6 บทความ — 4 เผยแพร่แล้ว · 1 ตั้งเวลาอนาคต · 1 ฉบับร่าง
    ok(count === 4, `แสดงเฉพาะบทความที่ถึงเวลาเผยแพร่ (${count} ใบ)`);
    ok(!(await page.content()).includes('โอ๊ตแช่ค้างคืน'), 'ฉบับร่างไม่ขึ้นหน้าร้าน');

    const title = (await cards.first().locator('h3').textContent())?.trim();
    await cards.first().locator('a').first().click();
    await page.waitForURL('**/articles/**');
    ok((await page.locator('main h1').textContent())?.trim() === title, 'กดการ์ดแล้วเข้าหน้าอ่านบทความเดียวกัน');
    ok((await page.locator('main h2').count()) > 0, 'เนื้อหามีหัวข้อย่อยจาก "## "');
    ok((await page.locator('main ul li').count()) > 0, 'เนื้อหามีรายการจาก "- "');
    ok((await page.getByRole('button', { name: 'ย้อนกลับ' }).count()) === 1, 'มีปุ่มย้อนกลับ ไม่ใช่ breadcrumb');
    ok((await page.locator('section[aria-labelledby=other-articles] article').count()) === 3, 'ท้ายหน้ามีบทความอื่น 3 ใบ');
    await shot(page, '17-article');

    // ไม่มีเลื่อนแนวนอน
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(!wide, 'หน้าอ่านบทความไม่มี horizontal scroll');

    /* ---------- ค้นหา ---------- */
    await page.goto(`${BASE}/search?q=มัทฉะ`);
    await page.locator('#search-articles').waitFor();
    ok((await page.locator('#search-articles').textContent())?.includes('บทความ'), 'หน้าค้นหามีหัวข้อบทความ');
    const order = await page.evaluate(() => [...document.querySelectorAll('main h2, section h2')].map((h) => h.id).filter(Boolean));
    ok(order.indexOf('search-articles') === order.length - 1, 'บทความอยู่ท้ายสุด (โปรโมชัน → สินค้า → บทความ)');

    /* ---------- หลังบ้าน ---------- */
    await login(page);
    ok((await page.locator('aside a[href="/admin/articles"], a[href="/admin/articles"]').count()) > 0, 'เมนูหลังบ้านมี "บทความ"');
    await page.goto(`${BASE}/admin/articles`);
    ok((await page.locator('tbody tr').count()) === 6, 'ตารางหลังบ้านเห็นทั้งฉบับร่างและตั้งเวลา');
    const badges = await page.locator('tbody tr').allTextContents();
    ok(badges.some((t) => t.includes('ฉบับร่าง')) && badges.some((t) => t.includes('ตั้งเวลา')), 'มีสถานะ ฉบับร่าง/ตั้งเวลา');

    await page.click('a[href="/admin/articles/new"]');
    await page.waitForURL('**/admin/articles/new');
    await page.fill('#title', 'ทดสอบบทความใหม่');
    ok((await page.inputValue('#slug')).length > 0, 'slug เติมอัตโนมัติจากหัวข้อ');
    await page.fill('#excerpt', 'สรุปสั้นสำหรับทดสอบ');
    await page.fill('#body', 'ย่อหน้าแรกของบทความทดสอบ\n\n## หัวข้อย่อย\n\n- ข้อหนึ่ง\n- ข้อสอง');
    // card ผู้ใช้ใน shell ก็มีปุ่ม submit (ออกจากระบบ) → เจาะจงปุ่มของฟอร์มบทความ
    await page.locator('form button[type=submit]', { hasText: 'เพิ่มบทความ' }).click();
    await page.waitForURL('**/admin/articles?saved=1');
    ok((await page.locator('tbody tr').count()) === 7, 'บันทึกแล้วมีบทความเพิ่ม');

    await page.goto(`${BASE}/articles`);
    ok((await page.locator('main article').count()) === 5, 'บทความใหม่ขึ้นหน้าร้านทันที');

    // พักไว้ (unpublish) แล้วต้องหายจากหน้าร้าน
    await page.goto(`${BASE}/admin/articles`);
    await page.locator('tbody tr', { hasText: 'ทดสอบบทความใหม่' }).getByRole('button', { name: 'พักไว้' }).click();
    await page.waitForTimeout(600);
    await page.goto(`${BASE}/articles`);
    ok((await page.locator('main article').count()) === 4, 'กดพักไว้แล้วหายจากหน้าร้าน');
  } catch (e) {
    console.log('💥', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
