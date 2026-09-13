# E-commerce Prototype

เว็บขายสินค้า + ระบบหลังบ้าน + โปรโมชันตั้งเวลา/จำกัดจำนวน — รันบนเครื่องเดียว ไม่ต้องติดตั้งฐานข้อมูล

## เริ่มใช้งาน

```bash
npm install
npm run seed     # สร้างข้อมูลสาธิต (6 หมวด · 24 สินค้า · 7 โปร · 2 ผู้ใช้ · ประวัติออเดอร์ 24 เดือน ~640 ใบ)
npm run dev      # http://localhost:3000
```

| ส่วน | URL | บัญชี |
|---|---|---|
| หน้าร้าน | `/` | — |
| หลังบ้าน | `/admin` | `admin` / `admin1234` (ทุกสิทธิ์) · `staff` / `staff1234` (สินค้า หมวด คำสั่งซื้อ) |

## ความสามารถ

**หน้าร้าน** — หน้าแรก · สินค้าทั้งหมด/ค้นหา/เรียง · หมวดหมู่ · รายละเอียดสินค้า · โปรโมชัน · ตะกร้า · คูปอง · checkout (ชำระเงินจำลอง) · เมนูบัญชี (จุดสามจุด): **โปรไฟล์ · รายการโปรด · ประวัติการสั่งซื้อ** (ไม่ต้อง login — ระบบจำเบราว์เซอร์ไว้ 1 ปี, เครื่องอื่นค้นด้วยเลขที่+เบอร์โทร) · responsive ทุกอุปกรณ์

**หลังบ้าน** — แดชบอร์ด (KPI + สถิติยอดขายราย วัน/เดือน/ปี · โปรกระตุ้นยอดขายไหม · หมวด/สินค้าขายดี) · สินค้า (อัปโหลดรูปหลายรูป) · หมวดหมู่ · โปรโมชัน · คำสั่งซื้อ (เปลี่ยนสถานะ/ยกเลิกคืน stock) · ผู้ใช้ (admin/staff) · ตั้งค่าร้าน

**โปรโมชัน 3 ชนิด** — ลดราคา (%/บาท ต่อสินค้าหรือหมวด) · คูปองโค้ด (ลด/ส่งฟรี/ยอดขั้นต่ำ) · ซื้อ X แถม Y
**ตั้งเวลา** เริ่ม–สิ้นสุด (โผล่/หายบนหน้าร้านเอง) · **จำกัดจำนวน** 3 แบบ: สิทธิ์รวม · ชิ้นต่อสินค้า · ครั้งต่อลูกค้า (นับจากเบอร์โทร)

## โครงสร้าง

```
data/                 ฐานข้อมูล JSON (อ่าน/เขียนผ่าน src/lib/db/store.ts เท่านั้น)
public/uploads/       รูปที่อัปโหลด · seed/ = placeholder
scripts/seed.ts       ข้อมูลสาธิต
e2e/                  ทดสอบ end-to-end ด้วย Playwright + Chrome
src/proxy.ts          กัน /admin/* (Next 16 ใช้ proxy แทน middleware)
src/lib/types.ts      domain types
src/lib/money.ts      เงินเป็นสตางค์ (integer) ทั้งระบบ
src/lib/pricing/      pricing engine — pure function + unit tests (โปรทุกชนิดคิดที่นี่ที่เดียว)
src/lib/db/           categories · products · promotions · orders · carts · wishlists · users · settings
src/lib/auth/         scrypt password · HMAC session cookie · roles/permissions
src/lib/actions/      server actions (ทุกตัวตรวจสิทธิ์เอง)
src/components/       ui · shop · admin
src/app/(shop)/       หน้าร้าน · src/app/admin/ หลังบ้าน
```

## คำสั่ง

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # รัน production build
npm run lint         # eslint
npm run typecheck    # next typegen + tsc
npm run test         # unit tests ของ pricing engine (node --test)
npm run seed         # reset ข้อมูลสาธิตทั้งหมด (ทับ orders ด้วยประวัติสาธิต 24 เดือน)
npm run seed:clean   # เหมือน seed แต่ orders ว่าง (e2e ใช้ เพราะเทสต์นับออเดอร์)
npm run e2e          # e2e ทุกไฟล์ (ต้องมี dev server รันอยู่ · ตั้ง BASE=http://localhost:3000 ได้)
```

## แนวคิดสำคัญ

- **usage ของโปรคำนวณจาก orders** (ไม่นับ cancelled) — ไม่มี counter แยก ยกเลิกออเดอร์แล้วสิทธิ์คืนเอง
- **ราคาทุกที่มาจาก `quote()`** ตัวเดียว: การ์ดสินค้า หน้าสินค้า ตะกร้า checkout จึงตรงกันเสมอ
- **checkout คิดราคาใหม่ด้วยเบอร์โทร** — ถ้าสิทธิ์ต่อลูกค้าทำให้ยอด/ของแถมเปลี่ยน จะให้ลูกค้ายืนยันอีกครั้งก่อนสร้างออเดอร์
- **ตัด stock แบบ all-or-nothing** รวมของแถม
- **ลูกค้าไม่ต้อง login** — cookie `ec_guest` (1 ปี) ผูกตะกร้า (`data/carts.json`) รายการโปรด (`data/wishlists.json`) และคำสั่งซื้อ (`order.guestIds`) · เปลี่ยนเครื่องแล้วยืนยันด้วยเลขที่ + เบอร์โทร ระบบจะผูกเครื่องใหม่ให้
- `SESSION_SECRET` ใน `.env` สำหรับใช้จริง (ดู `.env.example`)
