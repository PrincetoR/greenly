# E-commerce — CLAUDE.md

## TL;DR
เว็บขายสินค้า + ระบบหลังบ้าน + โปรโมชันตั้งเวลา/จำกัดจำนวน · run local/demo · ข้อมูลเป็น JSON ใน `data/`
Path: `~/Projects/e-commerce` · **build ครบ 8 phase แล้ว (2026-09-12)** · แผนเดิม: `~/.claude/plans/spicy-tumbling-frost.md`
Memory: `Brain/Memories/EcommercePrototype.md`

## Stack
Next.js 16 (App Router · Server Components · Server Actions · `proxy.ts` แทน middleware) · React 19 · Tailwind v4 · TypeScript · zod · lucide-react (ไอคอน SVG)
ไม่มี DB — `src/lib/db/store.ts` อ่าน/เขียน `data/*.json` (atomic + write queue)

## คำสั่ง
```bash
npm run dev         # http://localhost:3000  · หลังบ้าน /admin
npm run build && npm run lint && npm run typecheck
npm run test        # node --test ผ่าน tsx — pricing engine 28 + analytics 13 tests
npm run seed        # reset ข้อมูลสาธิตทั้งหมด (ทับ orders+payments ด้วยประวัติสาธิต 24 เดือน ~625 ใบ deterministic — ทุกใบมี payment/shipment/history)
npm run seed:clean  # orders ว่าง — e2e ใช้ (เทสต์นับออเดอร์/เลขที่ OD-…-0001) · รันไฟล์ e2e เดี่ยวต้อง seed:clean ก่อน · run-all จบแล้ว seed เต็มคืน
npm run e2e         # Playwright + Chrome ในเครื่อง (channel chrome) · ต้องมี dev server · BASE=... เปลี่ยน port ได้
```
บัญชีสาธิต: `admin` / `admin1234` (ทุกสิทธิ์) · `staff` / `staff1234` (สินค้า/หมวด/order เท่านั้น)

## โครงสร้าง
```
data/                 JSON database (commit seed ไว้)
public/uploads/       รูปที่อัปโหลด (gitignore) · seed/ = placeholder SVG (commit)
scripts/seed.ts       สร้างข้อมูลสาธิต
e2e/                  01–15 ไฟล์ทดสอบ + lib.js + run-all.js · shots/ ไม่ commit
src/proxy.ts          กัน /admin/* (ยกเว้น /admin/login, /admin/forbidden)
src/lib/types.ts      domain types ทั้งหมด — pure, ไม่ import อะไร
src/lib/money.ts      เงินเป็นสตางค์ integer · formatBaht/toSatang ที่เดียว
src/lib/datetime.ts   เวลาไทย Asia/Bangkok · datetime-local ↔ ISO · humanCountdown
src/lib/db/           ชั้นเข้าถึงข้อมูลชั้นเดียว — UI/actions ห้ามอ่านไฟล์ตรง
src/lib/auth/         password (scrypt) · token (HMAC, ใช้ใน proxy ได้) · session · roles + ADMIN_MENU
src/lib/pricing/      quote() pure · status · usage (นับจาก orders) · quote.test.ts
src/lib/promotions/   describe (ประโยคสรุป) · service (loadPromotionContext)
src/lib/analytics/    สถิติแดชบอร์ด pure: periods (ช่วง วัน/เดือน/ปี เวลาไทย) · sales · promotions (uplift) · categories (+topProducts) · analytics.test.ts
src/lib/orders/labels ป้าย/สี/hint ของสถานะ · NEXT_STATUS (transition) · TRANSITION_LABEL (กริยาบนปุ่ม) · ป้ายช่องทาง/สถานะชำระ
src/lib/shipping/     carriers (8 ขนส่ง + trackUrl + pattern เลขพัสดุ) · tracking (ไทม์ไลน์จำลองตามชั่วโมงหลังส่ง · isMockDelivered ≥ 44 ชม. · guessProvince)
src/lib/payments/     beam.ts pure (10 ช่องทาง + ค่าธรรมเนียมตัวอย่าง + BEAM_FEATURES + beamFee/availableChannels) · service.ts server (startBeamPayment / settleMockPayment / refundPayment)
src/lib/db/payments   ledger data/payments.json (1 ออเดอร์มีได้หลายรายการ: failed แล้วลองใหม่)
src/app/(pay)/pay/[id]  hosted checkout ของ Beam (จำลอง) — layout แยกไม่มี header ร้าน · components/pay/beam-checkout.tsx
src/app/api/payments/beam/webhook  POST รับ payment.succeeded/failed (mock — ยังไม่ตรวจลายเซ็น)
src/app/admin/(app)/shipping   คิวจัดส่ง (tabs รอแพ็ค/กำลังแพ็ค/ระหว่างส่ง/ตีกลับ/ตั้งค่า) · components/admin/shipping-queue.tsx (เลือกหลายใบ) · order-actions.tsx (ฟอร์ม transition ใช้ร่วมกับหน้ารายละเอียด)
src/app/admin/(print)/shipping/labels  ใบปะหน้ากล่อง ?ids=a,b (layout แยก ไม่มี chrome · @media print ใน globals.css)
src/app/admin/(app)/homepage   สไลด์แบนเนอร์ + ป๊อปอัป (data/homepage.json ผ่าน lib/db/homepage · actions/homepage · components/admin/homepage-forms) permission settings.manage
src/components/shop/hero-slider   สไลด์หน้าแรก (client: autoplay/ปุ่ม/จุด/ปัด/คีย์บอร์ด · translateX) · welcome-popup (client: localStorage `ec_popup_seen` {version,at} · ?popup=1 บังคับโชว์ · เด้งหลัง 400ms)
src/app/admin/(app)/payments   ledger Beam: ภาพรวม/รายการ+คืนเงิน/ตั้งค่า (permission payment.manage = admin)
src/lib/cart/         storage (ตะกร้า+คูปองใน data/carts.json ผูก guest id) · service (loadCart → quote)
src/lib/guest.ts      guest id cookie `ec_guest` 1 ปี — ตัวตนลูกค้าแบบไม่ต้อง login (readGuestId / ensureGuestId ใน action เท่านั้น)
src/lib/wishlist/     รายการโปรดผูก guest id (data/wishlists.json) · WishlistButton optimistic
src/lib/actions/      server actions ต่อ entity — ทุกตัวเรียก requirePermission()
src/lib/validation/   zod schemas · FormState { errors, values } · formValues()
src/components/ui     Button/Badge/Card/Field/EmptyState/Alert/Table/Switch/ConfirmButton
src/components/shop   header/footer/product-card/price-tag/promo-*/cart/checkout
src/components/admin  shell/product-form/image-uploader/promotion-form/product-picker/...
src/app/(shop)/       หน้าร้าน · src/app/admin/(app)/ หลังบ้าน (มี layout ตรวจ session)
```

## Convention
- ราคาเก็บเป็น **สตางค์** เสมอ แปลงตอนแสดงผลด้วย `formatBaht()`
- **ราคาทุกที่ต้องมาจาก `quote()`/`displayPrice()`** ห้ามคิดส่วนลดเองใน component
- usage ของโปรโมชัน **คำนวณจาก orders** (ไม่นับ cancelled) ไม่มี counter แยก
- **วงจรออเดอร์** `pending → paid(รอแพ็ค) → packing → shipped → done` · `shipped → returned → packing(ส่งใหม่) | cancelled` · ยกเลิกได้ก่อนส่ง · **การคืนเงินอยู่ที่ payment ไม่ใช่สถานะออเดอร์** (ยกเลิกออเดอร์ที่จ่าย Beam แล้ว → refund อัตโนมัติ) · shipped ต้องมีขนส่ง+เลขพัสดุ · returned ต้องมีเหตุผล · done ปิด COD = เก็บเงินแล้ว · ทุกอย่างผ่าน `changeOrderStatus` + `order.history`
- **payment**: `paymentMethod` = beam | cod (ไม่มี transfer แล้ว) · `order.payment` สรุป · Beam จริง = hosted checkout + webhook; mock = หน้า /pay ให้กด "จำลองสำเร็จ/ไม่สำเร็จ" · pending order ที่จ่าย Beam ล้มเหลว/หมดอายุ → ลูกค้ากด "ชำระเงินตอนนี้" สร้างรายการใหม่ (`payOrder`)
- **แยกเมนู "จัดส่ง" ออกจาก "คำสั่งซื้อ"** (พี่ต่อถามว่าควรแยกไหม): คำสั่งซื้อ = มุมมองบริการลูกค้า/การเงิน (ทุกสถานะ ค้นหา รายละเอียด) · จัดส่ง = มุมมองคลัง (คิวงานเป็นขั้น + bulk) — ข้อมูลชุดเดียวกัน
- "ลูกค้า 1 คน" = เบอร์โทรตอน checkout (`normalizeCustomerKey`) · **ตัวตนข้ามการเปิด/ปิด = guest id** (`order.guestIds` มีได้หลายเครื่องหลัง claim ด้วยเลขที่+เบอร์)
- หน้า `/order/[no]` เปิดได้เฉพาะ guest ที่อยู่ใน `guestIds` ไม่งั้นต้องกรอกเบอร์ก่อน (กันเดาเลขดูที่อยู่)
- ทุก server action ตรวจสิทธิ์เอง (proxy กันแค่ชั้นแรก)
- ฟอร์มที่ใช้ `useActionState`: เมื่อ validation ไม่ผ่านต้องคืน `values: formValues(formData)` และ input ใช้ `defaultValue={v.x ?? ...}` — เพราะ React รีเซ็ตฟอร์มหลัง action จบ · **radio ที่ควบคุมด้วย state ก็หลุดหลังรีเซ็ต** (checked prop ไม่เปลี่ยนเลยไม่ถูกเขียนกลับ) → ส่งค่าจริงผ่าน hidden input + ref ซิงก์ `el.checked` (checkout-form วิธีชำระ)
- client component ที่ใช้เวลาปัจจุบัน ให้รับ `serverNow`/`initial` จาก server เพื่อกัน hydration mismatch
- **ห้ามใช้ emoji เป็นไอคอน** (พี่ต่อไม่เอา) ใช้ `lucide-react` · ไอคอนเมนูหลังบ้านเป็นชื่อใน roles.ts map ที่ `components/admin/icons.tsx` · ไอคอนประเภทโปรที่ `components/shop/promo-type-icon.tsx`
- **ไม่ใส่ลูกศร →/← ท้ายหรือหน้าเมนู/ลิงก์/ปุ่ม** (พี่ต่อสั่งเอาออกทั้งหมด)
- **แถบสถานะบนสุด (แบบ Shopee, md+, ไม่ sticky)**: ซ้าย tagline · ขวา รายการโปรด (นับ) · ประวัติการสั่งซื้อ · ชื่อ login (username) หรือ `guest` → /account · พื้นสีแบรนด์ (bg-brand) ลิงก์ขาว 85% ชื่อผู้ใช้ขาว — ลองขาวแล้วพี่ต่อขอสี · ต้องเป็น snap point (`.status-bar`) ไม่งั้นโหลดมาโดน snap เลื่อนพ้นจอ
- โลโก้ = ชื่อร้านตัวหนา 30px ไม่มีไอคอน (พี่ต่อเอาใบไม้ออก) สองโทน: 2 ตัวท้ายเป็น `--logo-accent` ทอง (#d98a0c — พี่ต่อไม่เอาส้ม/ชมพู) · ช่องโลโก้กว้างได้ ~112px ถ้าชื่อร้านยาวจะโดน truncate
- header ลูกค้ามุมขวา: **[ตะกร้า] อย่างเดียว** (ปุ่มโปรไฟล์ย้ายไปแถบสถานะ) · ไม่มี hover effect · เดิม: **[บัญชี ▾] [ตะกร้า]** — ตะกร้าต้องอยู่ขวาสุดเสมอไม่มีอะไรมากั้น (พี่ต่อ: จุดสามจุดหลังตะกร้า "เหมือนกั้นรถเข็น") · AccountMenu = ไอคอนรูปคนเฉย ๆ (ไม่มีวงกลม/ลูกศร) ขนาดเดียวกับตะกร้า dropdown: โปรไฟล์ `/account` · รายการโปรด · ประวัติการสั่งซื้อ `/orders` · มือถือซ่อนปุ่มบัญชี ย้ายเข้า drawer
- **หลังบ้านใช้ header หน้าร้านตัวเดียวกัน** (`loadShopHeaderProps` ใน `components/shop/header-data.ts` โหลดข้อมูล header ที่เดียว ใช้ทั้ง 2 layout) เมนู "การจัดการ" active · `AdminShell` โครงเดียวกับหน้ารายการสินค้า: คอลัมน์ซ้าย `--aside-w` เป็น card **"จัดการสินค้า"** ดีไซน์/ระยะเท่า card หมวดหมู่ทุกอย่าง (หัว 40 · เส้นคั่น `divider-caret` · รายการ `px-3 py-1.5 text-[15px]` ไม่มีไอคอน · active `bg-brand-soft text-brand` · sticky top-65) แก้ที่ product-listing ต้องแก้ shell ด้วย (e2e/13 ตรวจทุกเส้นเทียบกับ /products) · card ผู้ใช้ (ชื่อ · role · ออกจากระบบ) แยกอยู่ใต้ card เมนู · เนื้อหา `pt-4` · `PageHeader` h1 `leading-10` ให้กึ่งกลางตรง "จัดการสินค้า" · **แดชบอร์ดไม่มี h1/บรรทัดทักทาย** (พี่ต่อเอาออก) แถว KPI เริ่มที่ขอบบนเดียวกับ card เมนู · **ส่วนล่างเป็นสถิติ ไม่ใช่รายการ** (พี่ต่อ: รายการออเดอร์/โปร/สต็อกละเอียดเกิน ซ้ำกับ KPI ที่กดเข้าไปดูได้): ยอดขายราย วัน/เดือน/ปี (`?range=` ลิงก์ ทุก card ใช้ช่วงเดียวกัน เทียบช่วงก่อนหน้าที่ยาวเท่ากัน) · "โปรโมชันกระตุ้นยอดขาย N อันดับ" (เฟืองเหมือนกัน `topPromotions`) = ตารางรายโปรอย่างเดียว (ยอด/วัน ระหว่างโปร vs ก่อนโปร — ไม่ตัดปัจจัยอื่น บอกไว้ในคำอธิบาย) **ไม่มีแถวสรุปรวม** สัดส่วน/AOV/ส่วนลดรวม (พี่ต่อ: ค่าเฉลี่ยรวมไม่ใช่ข้อมูลเฉพาะ ดูแล้วงง) · "หมวดหมู่ขายดี N อันดับ" (ป้ายขายดีสุด/ขายน้อยสุด) · "สินค้าขายดี N อันดับ" — N ตั้งจาก**รูปเฟืองมุมขวาการ์ด** (ไอคอนเปล่า `size-4` เท่าตัวอักษร ไม่มีกล่อง ห่างขอบบน/ขวาของ card 20px เท่ากัน — `mt-1` บน py-4 ของ header — พี่ต่อขอสมมาตรกับขอบ · `components/admin/rank-setting.tsx` ป๊อปอัป 5/10/20 หรือพิมพ์ 1–50 → action `updateDashboardRank` ทุกคนที่ login เปลี่ยนได้ เก็บใน `settings.dashboard` **ค่าเริ่มต้น 5** ขอบเขตที่ `lib/analytics/ranks.ts`) · ป้าย "ขายน้อยสุด" ติดเฉพาะเมื่อแสดงครบทุกหมวด (ตัดที่ N แล้วตัวท้ายไม่ใช่ตัวน้อยสุดจริง) · กราฟแท่งเป็น HTML div (ไม่ใช่ SVG) ให้ยืดตามจอโดยตัวหนังสือไม่ย่อ · component ที่ `components/admin/analytics.tsx` · มือถือ: เมนูหลังบ้าน + ออกจากระบบอยู่ใน drawer ของ header (`adminItems` prop) ไม่มี top bar/drawer ของตัวเองแล้ว
- **หมวดหมู่มี `image` (อัปโหลด 1 รูป) และ `icon` (ชื่อ lucide จาก `lib/catalog/category-icons.ts` 20 ตัว · component `components/category-icon.tsx` prop `icon` — ห้ามใช้ชื่อ prop `name` ชนกับ SVG attr)** · หน้าแรกแสดงหมวดเป็นการ์ด grid 3/4/8 คอลัมน์ รูปกลมหรือไอคอนในวงกลม brand-soft · ImageUploader รับ prop `name` + `max={1}` (ไม่โชว์ป้ายรูปปก)
- หน้าแรกด้านบน = **แบนเนอร์แบบ Shopee** (พี่ต่อขอ): **แถบพื้นขาวสุดจอ** `bg-surface border-b` ต่อจากเส้นล่างของ header (ไม่มีเส้นบนเอง — พี่ต่อสั่ง) ข้างในคอนเทนเนอร์ `max-w-6xl px-4 pb-4` (เนื้อหา 80–1200 · **รูปชิดเส้น header ไม่เว้นบน มุมบนไม่มน** — พี่ต่อสั่ง) grid `2fr_1fr` สูง 372 บน md+ — ซ้าย = สไลด์ใหญ่ (`slot: 'main'` เลื่อนเอง ข้อความมุมล่างซ้าย จุดมุมล่างขวา) · **ไม่มีปุ่มในสไลด์/ป๊อปอัป** (พี่ต่อสั่ง) คลิกทั้งภาพ/เนื้อหาไป href · ป๊อปอัปปิดด้วยกากบาท/คลิกนอก/Esc เท่านั้น ขวา = ภาพเล็ก 2 ช่องซ้อนแนวตั้ง (`slot: 'side'` 2 ใบแรกตามลำดับ นิ่ง คลิกได้) · มือถือ: สไลด์ 16:9 + ภาพเล็ก 2 คอลัมน์ข้างล่าง · ไม่มีภาพเล็ก = สไลด์เต็มการ์ด 8:3 · รูปแนะนำ 2:1 ทั้งคู่ (ไม่มีสไลด์ = ชื่อร้าน+สโลแกนแบบเดิม) · h1 ชื่อร้าน `sr-only` (e2e/07 นับ h1) · หัวข้อสไลด์เป็น `<p>` ไม่ใช่ h2 (e2e นับ `main h2` เป็นลำดับ section) · **ป๊อปอัปตอนเข้าเว็บ** เปิดเฉพาะ seed สาธิต (`enabled: WITH_HISTORY`) เพราะบังปุ่มที่ e2e กด · version เปลี่ยนทุกครั้งที่บันทึก → ลูกค้าที่ปิดแล้วเห็นใหม่
- หน้าแรก: ลำดับ section = หมวดหมู่ (การ์ด) · โปรโมชันตอนนี้ · สินค้าแนะนำ · **สินค้าขายดี** (topProducts 30 วัน 8 ใบ ป้าย "ขายดี #n" · <4 ตัวใช้ทั้งหมด · ไม่มีออเดอร์ = ซ่อน) · สินค้าใหม่
- หน้ารายการสินค้า: หมวดหมู่เป็น **card แถบข้างซ้ายอย่างเดียว** (พี่ต่อเอาแบบ chip/tag ออก) ขอบบน card ตรงกับช่องค้นหา · มือถือเป็น dropdown (`CategorySelect`)
- การ์ดสินค้า: แถวล่าง = ราคา · หัวใจ · ใส่ตะกร้า (QuickAddButton ใส่ 1 ชิ้นจากหน้ารายการได้เลย) — ปุ่มอยู่นอก `<Link>`
- **มุมมน 6px ทั้งระบบ** — `--radius: 6px` ใน globals.css และ override `--radius-md/lg/xl` ให้เท่ากัน (rounded-full สำหรับวงกลม/pill คงไว้) ห้ามใส่ radius เป็นตัวเลขตรง ๆ
- สไตล์ input/select/textarea อยู่ใน `globals.css` — ไม่ใส่ class ซ้ำที่ element
- comment ในโค้ดเป็นภาษาไทย อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"
- `~/Projects/Prototype/e-commerce` และ `~/Projects/storefront-kit` เป็นตัวอ้างอย่างเดียว ห้ามยกโค้ด/แก้/ลบ

## กฎตอนรัน dev / ทดสอบ
- **ห้ามรัน `next dev` ซ้อนกัน 2 ตัวบน project เดียวกัน** (ทั้งคู่ใช้ `.next/dev` เดียวกัน → HMR พัง แก้ไฟล์แล้วไม่เปลี่ยน ต้อง restart)
  · ก่อนรัน e2e ให้เช็ค `lsof -iTCP:3000 -sTCP:LISTEN` — ถ้าพี่ต่อรัน dev อยู่แล้ว ใช้ `BASE=http://localhost:3000` ยิงตัวนั้น
  · ห้ามรัน `next build` ขณะ dev รันอยู่ (ไปใช้ typecheck/lint แทน แล้ว build ตอนจบ)
- ถ้า HMR เพี้ยน: หยุด dev ทุกตัว → `rm -rf .next` → `npm run dev`

- **เส้นแนวตั้งร่วม**: `--aside-w` (220) ใน globals.css — header กล่องซ้าย [โลโก้ … เมนูแรก] กว้างเท่านี้ `justify-between` → ขอบขวา "สินค้าทั้งหมด" = ขอบขวา card หมวดหมู่ · เมนูถัดไป gap 4 + px-3 → ข้อความ "โปรโมชัน" เริ่มที่ขอบซ้ายการ์ด/ช่องค้นหา · เมนูกว้างตามข้อความ padding ซ้าย-ขวาเท่ากัน · โลโก้ truncate ถ้ายาว (พี่ต่อ perfectionist — e2e/11 ตรวจทุกเส้น < 0.5px)
- หน้ารายการสินค้า: แถวบน = [หัวข้อว่าเปิดอะไร + จำนวน … ช่องค้นหา · เรียงลำดับ] (ListingToolbar client: ค้นหาทันทีตอนพิมพ์ หน่วง 300ms ไม่มีปุ่ม · SortMenu dropdown เอง แสดง label สั้นบนปุ่ม) · **toolbar เป็น grid คอลัมน์เดียวกับกริดสินค้า**: lg หัวข้อ=การ์ด 1–2 · ช่วง [ค้นหา+เรียง] = การ์ด 3–4 แบ่ง `1fr_auto` gap 8: เรียงลำดับกว้างตามข้อความยาวสุด (จองที่ด้วย label ซ่อน) ค้นหากินที่เหลือ (e2e/11 ตรวจ) · **gap ระหว่างการ์ดหน้าร้านทุกกริด = 12px** (พี่ต่อสั่ง 2026-09-14 — หลังบ้านก็ 12 ระหว่างการ์ด · gap คอลัมน์ aside↔เนื้อหา ยัง 16 ทั้งสองฝั่ง) toolbar ใช้ `md:gap-3` เท่ากริดสินค้า · card หมวดหมู่บรรทัดแรก "หมวดหมู่สินค้า" (`-mt-px h-10` ชดเชย border) กึ่งกลางระดับแถวนี้ · เส้นคั่นที่ 40px · "ทั้งหมด" ขอบบนตรงขอบบนการ์ดสินค้า · padding บนหน้า 16px
- **sticky ตอนเลื่อน (จอ md+)**: card หมวดหมู่ (grid item เอง) + wrapper แถว [หัวข้อ ค้นหา เรียงลำดับ] ติดที่ `top-[65px]` (h-16 + border 1) · gap 16 บน/ล่างอยู่ใน wrapper (pt-4/pb-4) ให้เท่าตอนปกติ · พื้นทึบธรรมดา (พี่ต่อลอง backdrop-blur และไล่จาง 10px แล้วไม่เอาทั้งคู่) · แถบขยาย -mx-1 คลุม ring การ์ดที่ล้น 1px · มือถือไม่ sticky
- **scroll snap หน้ารายการ (md+)**: `html:has(.snap-rows)` = `scroll-snap-type: y mandatory` · การ์ด `scroll-snap-align: start; scroll-margin-top: 137px` (= header 65 + 16 + แถบ 40 + 16) ให้แถวถัดไปชิดขอบล่างแถบ sticky พอดี · footer เป็น `scroll-snap-align: end` ไม่งั้นเลื่อนไม่ถึงล่างสุด · ถ้าความสูงแถบ/gap เปลี่ยนต้องแก้ 137 ด้วย
- **scroll snap หน้าแรก (md+)**: `.snap-sections` ที่ root หน้าแรก · ทุก `<Section>` มี `.snap-section` (`scroll-margin-top: 81` = header 65 + 16) · footer snap end · แถบสถานะ snap start — กฎเดียวกับหน้ารายการ (e2e/02 ตรวจ)
- `sticky` ใน CSS grid ต้องใส่ที่ตัว grid item เอง (ลูกข้างในขยับได้แค่ในช่องที่สูงเท่าเนื้อหา)

## บทเรียนจากการทดสอบ
- หลังบ้าน: ระยะระหว่างการ์ด/รายการ = **12px** (`gap-3`, Card ฟอร์ม → รายการ `mb-3`, card ผู้ใช้ใต้เมนู `mt-3`) · ระยะที่ไม่ใช่การ์ด (ใต้หัวหน้า, แถวกรอง → ตาราง) ยัง 16
- `CardHeader` กล่องหัวข้อเป็น `flex-1 basis-60` — คำอธิบายยาวตัดบรรทัดในกล่อง ไม่ดัน action (ปุ่ม/เฟือง) ตกไปบรรทัดใหม่
- **grid track ถ่างตาม min-content ของลูก** — ตารางใน `overflow-x-auto` หรือข้อความ `truncate` ที่อยู่ใน grid item จะดัน track ให้กว้างเกินจอ (หน้าเลื่อนข้างได้ ทั้ง 1280 และมือถือ) · แก้: container ซ้อนกันแนวตั้งใช้ `flex flex-col` ไม่ใช่ `grid` · grid item ที่มีของกว้างใส่ `min-w-0` · คอลัมน์ `1fr` ที่มี truncate ใช้ `minmax(0,1fr)`
- **เส้นขอบใช้ `border border-line` เสมอ ไม่ใช้ `ring-1 ring-line`** — ring เป็น box-shadow วาดนอกกล่อง เส้นที่เห็นเลื่อนออก 1px ทำให้แนวการ์ด/ช่องกรอก/aside ไม่ตรงกัน (เปลี่ยนทั้งระบบแล้ว 2026-09-14) · ยกเว้น state เลือก (ring-2 ring-brand) ที่ไม่กระทบ layout
- **ข้อความไทยที่ใช้ `truncate`/overflow-hidden ต้องมี line-height สูงพอ** (≥ 1.6 หรือเต็มแถว) ไม่งั้นวรรณยุกต์/สระบน (ไม้โท, ั) โดนตัดหัว — เจอที่หัวข้อหน้ารายการและชื่อสินค้าบนการ์ด
- container ที่ `overflow-x-auto` จะ clip แนวตั้งด้วย → `ring` (box-shadow) ของลูกโดนตัดขอบบน/ล่าง ต้องใส่ `py-1` ให้เสมอ
- id ที่ต้องผ่าน regex ความยาว ห้ามสร้างจาก base64url แล้วตัดอักขระทิ้ง (ความยาวไม่แน่นอน → พังแบบสุ่ม 39%) ใช้ hex
- Playwright screenshot ค่าเริ่มต้นแอบใส่ `style="caret-color: transparent"` ให้ input → เจอ hydration mismatch ปลอม ใช้ `caret: 'initial'` เสมอ
- slug ภาษาไทยมาถึง `params` แบบ percent-encoded → `decodeSlug()` ก่อนค้น
- header **ไม่มีช่องค้นหา** (พี่ต่อไม่ชอบ เอาออก 2026-09-14) — ค้นหาที่หน้ารายการสินค้าเท่านั้น · (เดิม: header ห้ามใช้ `useSearchParams` ไม่งั้นถูก stream หลัง fallback)
