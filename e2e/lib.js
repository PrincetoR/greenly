/**
 * E2E ด้วย Playwright + Chrome ที่ติดตั้งในเครื่อง (channel: 'chrome') — ไม่ต้องดาวน์โหลด browser
 *   npm run dev            (อีก terminal)
 *   npm run e2e            (รันทุกไฟล์เรียงลำดับ · reseed ก่อนแต่ละไฟล์)
 *   BASE=http://localhost:3000 node e2e/02-storefront.js
 * ผลลัพธ์: ✅/❌ ต่อข้อ · ภาพหน้าจออยู่ใน e2e/shots/ (ไม่ commit)
 */
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { chromium } = require('playwright');

const BASE = process.env.BASE ?? 'http://localhost:3000';
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const PUBLIC = path.join(ROOT, 'public');
const SHOT = path.join(__dirname, 'shots');
const UPLOAD_TMP = path.join(os.tmpdir(), 'ec-test-upload.png');
fs.mkdirSync(SHOT, { recursive: true });

async function launch(viewport = { width: 1280, height: 900 }) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport, locale: 'th-TH' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 200));
  });
  return { browser, ctx, page };
}

async function login(page, user = 'admin', pass = 'admin1234') {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('#username', user);
  await page.fill('#password', pass);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => u.pathname === '/admin' || (u.pathname.startsWith('/admin/') && !u.pathname.startsWith('/admin/login')));
}

/** เลือกค่าใน dropdown `Select` ของเรา (ไม่ใช่ <select>): กดปุ่ม (combobox) แล้วกดตัวเลือกตามข้อความ */
async function pick(page, selector, label) {
  await page.locator(selector).click();
  await page.locator('[role=listbox]').waitFor();
  await page.getByRole('option', { name: label, exact: true }).click();
  await page.locator('[role=listbox]').waitFor({ state: 'detached' });
}

const shot = (page, name) => page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true, caret: 'initial' });
const ok = (cond, msg) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  if (!cond) process.exitCode = 1;
};

module.exports = { BASE, DATA, PUBLIC, SHOT, UPLOAD_TMP, launch, login, shot, ok, pick };
