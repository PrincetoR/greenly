import { NextResponse } from 'next/server';
import { STORAGE_DRIVER, readDocument, updateDocument } from '@/lib/db/store';

export const dynamic = 'force-dynamic';

/**
 * ตรวจสุขภาพที่เก็บข้อมูลบน deploy (ไม่โชว์ค่า secret): driver ที่ใช้ · มี Blob token ไหม · ทดลองอ่าน+เขียน document `health`
 * ใช้ไล่ปัญหา Vercel (filesystem เขียนไม่ได้ / DATABASE_URL ไม่ถูก) — เปิด /api/health ดูได้เลย
 */
export async function GET() {
  const out: Record<string, unknown> = {
    driver: STORAGE_DRIVER,
    databaseUrl: Boolean(process.env.DATABASE_URL),
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    region: process.env.VERCEL_REGION ?? null,
  };
  try {
    const before = await readDocument<{ n: number }>('health', { n: 0 });
    const after = await updateDocument<{ n: number }>('health', { n: 0 }, (d) => ({ n: d.n + 1 }));
    out.read = before.n;
    out.write = after.n;
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
