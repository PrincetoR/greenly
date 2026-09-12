import Link from 'next/link';
import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl" aria-hidden>
        🧭
      </span>
      <h1 className="mt-4 text-2xl font-bold">ไม่พบหน้าที่ต้องการ</h1>
      <p className="mt-2 text-muted">ลิงก์อาจถูกเปลี่ยนหรือสินค้าถูกนำออกจากร้านแล้ว</p>
      <Link href="/" className={`${buttonStyles()} mt-6`}>
        กลับหน้าแรก
      </Link>
    </main>
  );
}
