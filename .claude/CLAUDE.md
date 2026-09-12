# E-commerce — CLAUDE.md

## TL;DR
เว็บขายสินค้า + ระบบหลังบ้าน + โปรโมชันตั้งเวลา/จำกัดจำนวน · run local/demo · ข้อมูลเป็น JSON ใน `data/`
Path: `~/Projects/e-commerce` · แผนเต็ม: `~/.claude/plans/spicy-tumbling-frost.md`
Memory: `Brain/Memories/EcommercePrototype.md`

## Stack
Next.js 16 (App Router · Server Components · Server Actions · `proxy.ts` แทน middleware) · React 19 · Tailwind v4 · TypeScript · zod
ไม่มี DB — `src/lib/db/store.ts` อ่าน/เขียน `data/*.json` (atomic + write queue)

## คำสั่ง
```bash
npm run dev         # http://localhost:3000  · หลังบ้าน /admin
npm run build && npm run lint && npm run typecheck
npm run test        # node --test ผ่าน tsx — pricing engine
npm run seed        # reset ข้อมูลสาธิตทั้งหมด (ทับ orders ด้วย)
```
บัญชีสาธิต: `admin` / `admin1234` (ทุกสิทธิ์) · `staff` / `staff1234` (สินค้า/หมวด/order เท่านั้น)

## โครงสร้าง
```
data/                 JSON database (commit seed ไว้)
public/uploads/       รูปที่อัปโหลด · seed/ = placeholder SVG
scripts/seed.ts       สร้างข้อมูลสาธิต
src/proxy.ts          กัน /admin/* (ยกเว้น /admin/login)
src/lib/types.ts      domain types ทั้งหมด — pure, ไม่ import อะไร
src/lib/money.ts      เงินเป็นสตางค์ integer · formatBaht/toSatang ที่เดียว
src/lib/db/           ชั้นเข้าถึงข้อมูลชั้นเดียว — UI/actions ห้ามอ่านไฟล์ตรง
src/lib/auth/         password (scrypt) · session (cookie เซ็น HMAC) · roles
src/lib/pricing/      pricing engine pure function + tests (โปรโมชันทั้งหมดคิดที่นี่)
src/lib/cart/         ตะกร้าใน cookie
src/lib/actions/      server actions ต่อ entity — ทุกตัวเรียก requireRole()
src/components/ui     Button/Badge/Card/Field/EmptyState/Alert
src/components/shop   หน้าร้าน · src/components/admin หลังบ้าน
src/app/(shop)/       หน้าร้าน · src/app/admin/ หลังบ้าน
```

## Convention
- ราคาเก็บเป็น **สตางค์** เสมอ แปลงตอนแสดงผลด้วย `formatBaht()`
- usage ของโปรโมชัน **คำนวณจาก orders** (ไม่นับ cancelled) ไม่มี counter แยก
- "ลูกค้า 1 คน" = เบอร์โทรตอน checkout
- ทุก server action ตรวจสิทธิ์เอง (proxy กันแค่ชั้นแรก)
- สไตล์ input/select/textarea อยู่ใน `globals.css` — ไม่ใส่ class ซ้ำที่ element
- comment ในโค้ดเป็นภาษาไทย อธิบาย "ทำไม" ไม่ใช่ "ทำอะไร"
- `~/Projects/Prototype/e-commerce` และ `~/Projects/storefront-kit` เป็นตัวอ้างอย่างเดียว ห้ามยกโค้ด/แก้/ลบ
