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

**หน้าร้าน** — หน้าแรก (สไลด์แบนเนอร์ + ป๊อปอัปตอนเข้าเว็บ ตั้งจากหลังบ้าน · การ์ดหมวดหมู่ · สินค้าขายดี) · สินค้าทั้งหมด/ค้นหา/เรียง · หมวดหมู่ · รายละเอียดสินค้า · โปรโมชัน · ตะกร้า · คูปอง · checkout (ชำระผ่าน **Beam** จำลอง — PromptPay/บัตร/Mobile Banking/E-Wallet/ผ่อน หรือเก็บเงินปลายทาง) · หน้าออเดอร์มี **ขั้นตอน + ติดตามพัสดุ** (ไทม์ไลน์ขนส่งจำลอง ลิงก์เว็บขนส่ง) · เมนูบัญชี (จุดสามจุด): **โปรไฟล์ · รายการโปรด · ประวัติการสั่งซื้อ** (ไม่ต้อง login — ระบบจำเบราว์เซอร์ไว้ 1 ปี, เครื่องอื่นค้นด้วยเลขที่+เบอร์โทร) · responsive ทุกอุปกรณ์

**หลังบ้าน** — แดชบอร์ด (KPI + สถิติยอดขายราย วัน/เดือน/ปี · โปรกระตุ้นยอดขายไหม · หมวด/สินค้าขายดี) · สินค้า (อัปโหลดรูปหลายรูป) · หมวดหมู่ · โปรโมชัน · คำสั่งซื้อ (วงจร รอชำระ → รอแพ็ค → กำลังแพ็ค → จัดส่งแล้ว → ถึงมือลูกค้า · ตีกลับ/ส่งใหม่ · ยกเลิกคืน stock + คืนเงิน · ประวัติ/โน้ต · คัดลอกที่อยู่) · **จัดส่ง** (คิวแพ็ค เลือกหลายใบ **พิมพ์ใบปะหน้ากล่อง** ใส่เลขพัสดุ ซิงก์สถานะพัสดุ ตั้งค่าผู้ส่ง/ขนส่ง) · **หน้าแรก** (สไลด์: รูป/ข้อความ/ลิงก์คลิก/ลำดับ/เวลาเลื่อน · ป๊อปอัป: รูป/ข้อความ/ปุ่ม/ความกว้าง/ความถี่) · **การชำระเงิน** (ledger Beam: ยอด/ค่าธรรมเนียม/สัดส่วนช่องทาง/COD · คืนเงินเต็ม/บางส่วน · ตั้งค่า Beam 10 ช่องทาง + webhook) · ผู้ใช้ (admin/staff) · ตั้งค่าร้าน

**Beam (mock)** — `/pay/[id]` จำลอง hosted checkout ของ Beam: เลือกช่องทาง → "ชำระเงิน" = แจ้งผลสำเร็จเหมือน webhook (`POST /api/payments/beam/webhook` ก็รับได้) · ค่าธรรมเนียม/รายชื่อธนาคารเป็นตัวอย่าง ต้องตรวจกับสัญญา Beam จริงตอนเชื่อมต่อ

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
npm run test         # unit tests pricing engine + analytics (node --test)
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

## Deploy บน Vercel

filesystem ของ Vercel เขียนไม่ได้ (ใส่ตะกร้า/สั่งซื้อ/บันทึกหลังบ้านจะ error) ต้องต่อที่เก็บข้อมูลภายนอก 2 อย่างจาก Vercel Marketplace — โค้ดสลับ driver ให้เองตาม env:

| ตั้งค่า | ที่ Vercel | env ที่ได้ | ใช้ทำอะไร |
|---|---|---|---|
| **Neon** (Postgres) | Project → Storage → Create Database → Neon | `DATABASE_URL` | เก็บ collection JSON ทั้งหมด (ตาราง `collections` สร้างเอง) · ยังไม่มีข้อมูล = ใช้ไฟล์ seed ใน `data/` ให้ก่อน |
| **Blob** | Project → Storage → Create → Blob | `BLOB_READ_WRITE_TOKEN` | รูปที่อัปโหลดจากหลังบ้าน (แทน `public/uploads/`) |
| `SESSION_SECRET` | Settings → Environment Variables | — | ลายเซ็น cookie login |

ตั้งแล้ว **Redeploy** หนึ่งครั้ง · รีเซ็ตข้อมูลสาธิตบน Vercel = ลบแถวในตาราง `collections` (จะกลับไปใช้ไฟล์ seed) · ในเครื่องยังใช้ไฟล์ `data/*.json` เหมือนเดิม ไม่ต้องตั้งอะไร
