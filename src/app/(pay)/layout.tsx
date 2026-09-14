import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * เปลือกหน้าชำระเงินของ Beam (จำลอง) — ไม่ใช้ header/footer ร้าน เพราะของจริงคือหน้าที่ Beam โฮสต์เอง (คนละโดเมน)
 * ตั้งใจให้ดูต่างจากร้าน เพื่อให้เห็นภาพว่าลูกค้าออกจากเว็บร้านไปจ่ายที่ Beam แล้วเด้งกลับ
 */
export default function PayLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f3f4f8] text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <p className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-ink text-sm text-white" aria-hidden>
              b
            </span>
            Beam Checkout
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">SANDBOX · จำลอง</span>
          </p>
          <p className="flex items-center gap-1 text-xs text-muted">
            <ShieldCheck className="size-4" aria-hidden />
            เข้ารหัส · PCI DSS
          </p>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        หน้านี้เป็นการจำลองหน้าชำระเงินของ Beam เพื่อดูภาพรวม ไม่มีการตัดเงินจริง ·{' '}
        <Link href="/" className="hover:text-ink">
          กลับไปหน้าร้าน
        </Link>
      </footer>
    </div>
  );
}
