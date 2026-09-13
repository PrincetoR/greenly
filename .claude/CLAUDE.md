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
npm run test        # node --test ผ่าน tsx — pricing engine 28 tests
npm run seed        # reset ข้อมูลสาธิตทั้งหมด (ทับ orders ด้วย)
npm run e2e         # Playwright + Chrome ในเครื่อง (channel chrome) · ต้องมี dev server · BASE=... เปลี่ยน port ได้
```
บัญชีสาธิต: `admin` / `admin1234` (ทุกสิทธิ์) · `staff` / `staff1234` (สินค้า/หมวด/order เท่านั้น)

## โครงสร้าง
```
data/                 JSON database (commit seed ไว้)
public/uploads/       รูปที่อัปโหลด (gitignore) · seed/ = placeholder SVG (commit)
scripts/seed.ts       สร้างข้อมูลสาธิต
e2e/                  01–07 ไฟล์ทดสอบ + lib.js + run-all.js · shots/ ไม่ commit
src/proxy.ts          กัน /admin/* (ยกเว้น /admin/login, /admin/forbidden)
src/lib/types.ts      domain types ทั้งหมด — pure, ไม่ import อะไร
src/lib/money.ts      เงินเป็นสตางค์ integer · formatBaht/toSatang ที่เดียว
src/lib/datetime.ts   เวลาไทย Asia/Bangkok · datetime-local ↔ ISO · humanCountdown
src/lib/db/           ชั้นเข้าถึงข้อมูลชั้นเดียว — UI/actions ห้ามอ่านไฟล์ตรง
src/lib/auth/         password (scrypt) · token (HMAC, ใช้ใน proxy ได้) · session · roles + ADMIN_MENU
src/lib/pricing/      quote() pure · status · usage (นับจาก orders) · quote.test.ts
src/lib/promotions/   describe (ประโยคสรุป) · service (loadPromotionContext)
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
- "ลูกค้า 1 คน" = เบอร์โทรตอน checkout (`normalizeCustomerKey`) · **ตัวตนข้ามการเปิด/ปิด = guest id** (`order.guestIds` มีได้หลายเครื่องหลัง claim ด้วยเลขที่+เบอร์)
- หน้า `/order/[no]` เปิดได้เฉพาะ guest ที่อยู่ใน `guestIds` ไม่งั้นต้องกรอกเบอร์ก่อน (กันเดาเลขดูที่อยู่)
- ทุก server action ตรวจสิทธิ์เอง (proxy กันแค่ชั้นแรก)
- ฟอร์มที่ใช้ `useActionState`: เมื่อ validation ไม่ผ่านต้องคืน `values: formValues(formData)` และ input ใช้ `defaultValue={v.x ?? ...}` — เพราะ React รีเซ็ตฟอร์มหลัง action จบ
- client component ที่ใช้เวลาปัจจุบัน ให้รับ `serverNow`/`initial` จาก server เพื่อกัน hydration mismatch
- **ห้ามใช้ emoji เป็นไอคอน** (พี่ต่อไม่เอา) ใช้ `lucide-react` · ไอคอนเมนูหลังบ้านเป็นชื่อใน roles.ts map ที่ `components/admin/icons.tsx` · ไอคอนประเภทโปรที่ `components/shop/promo-type-icon.tsx`
- **ไม่ใส่ลูกศร →/← ท้ายหรือหน้าเมนู/ลิงก์/ปุ่ม** (พี่ต่อสั่งเอาออกทั้งหมด)
- header ลูกค้า: ไอคอนมุมขวาเรียง wishlist · cart · profile(→ /orders) ทุกจอ
- สไตล์ input/select/textarea อยู่ใน `globals.css` — ไม่ใส่ class ซ้ำที่ element
- comment ในโค้ดเป็นภาษาไทย อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"
- `~/Projects/Prototype/e-commerce` และ `~/Projects/storefront-kit` เป็นตัวอ้างอย่างเดียว ห้ามยกโค้ด/แก้/ลบ

## บทเรียนจากการทดสอบ
- id ที่ต้องผ่าน regex ความยาว ห้ามสร้างจาก base64url แล้วตัดอักขระทิ้ง (ความยาวไม่แน่นอน → พังแบบสุ่ม 39%) ใช้ hex
- Playwright screenshot ค่าเริ่มต้นแอบใส่ `style="caret-color: transparent"` ให้ input → เจอ hydration mismatch ปลอม ใช้ `caret: 'initial'` เสมอ
- slug ภาษาไทยมาถึง `params` แบบ percent-encoded → `decodeSlug()` ก่อนค้น
- header ห้ามใช้ `useSearchParams` ไม่งั้นทั้ง header ถูก stream หลัง fallback
