import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel: ไฟล์ seed ใน data/ ต้องถูก bundle ไปกับทุก route (อ่านตอนยังไม่มีแถวใน DB) — ไม่งั้น tracer อาจตัดทิ้ง
  outputFileTracingIncludes: { '/**': ['./data/**'] },
};

export default nextConfig;
