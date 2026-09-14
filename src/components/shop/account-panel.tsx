'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, LogIn, User } from 'lucide-react';
import { LoginForm } from '@/components/admin/login-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * หน้าโปรไฟล์ 2 บาน (พี่ต่อสั่ง 2026-09-15): บานซ้าย = โปรไฟล์ (children จาก server) · กด "เข้าสู่ระบบ" แล้ว
 * เลื่อนไปทางซ้ายเผยบานขวา = ฟอร์ม login — header/แถบเมนูล่างอยู่ที่เดิม ไม่พาไปหน้าอื่น
 * login สำเร็จ: ลูกค้า → กลับ /account (server render ใหม่เป็นโหมด customer) · พนักงาน → /admin · บานที่ซ่อนใส่ inert กันโฟกัสหลง
 * โฟกัสช่องชื่อผู้ใช้เองด้วย preventScroll — autoFocus ธรรมดาจะทำให้ container overflow-hidden เลื่อน scrollLeft ไปอีก 1 บาน (เลื่อนซ้อนกับ translate → จอว่าง)
 */
export function AccountPanel({ name, sub, guest, children }: { name: string; sub: string; guest: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      box.current?.querySelector<HTMLInputElement>('#username')?.focus({ preventScroll: true });
      if (box.current) box.current.scrollLeft = 0;
    }, 320);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <div ref={box} className="overflow-hidden">
      <div className={cn('flex w-[200%] transition-transform duration-300 ease-out', open && '-translate-x-1/2')}>
        <section className="w-1/2 shrink-0" aria-hidden={open} inert={open}>
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
              <User className="size-7" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{name}</h1>
              <p className="text-sm text-muted">{sub}</p>
            </div>
            {guest && (
              <Button variant="secondary" onClick={() => setOpen(true)} className="shrink-0">
                <LogIn className="size-4" aria-hidden />
                เข้าสู่ระบบ
              </Button>
            )}
          </div>
          {children}
        </section>

        <section className="w-1/2 shrink-0" aria-hidden={!open} inert={!open} aria-label="เข้าสู่ระบบ">
          <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            กลับไปโปรไฟล์
          </button>
          <div className="mt-4 rounded-card bg-surface p-5 border border-line sm:max-w-sm">
            <h2 className="text-lg font-bold">เข้าสู่ระบบ</h2>
            <p className="mt-0.5 mb-4 text-sm text-muted">ใช้บัญชีลูกค้า — พนักงานร้านเข้าตรงนี้ได้เหมือนกัน จะพาไปหน้าการจัดการ</p>
            {/* mount เฉพาะตอนเปิด — ฟอร์มสั้น ไม่ต้องอยู่ใน DOM ตลอด */}
            {open && <LoginForm autoFocus={false} />}
          </div>
          {/* บัญชีสาธิตทั้ง 3 role พร้อมรหัส (พี่ต่อสั่ง 2026-09-15) */}
          <div className="mt-3 text-xs text-muted sm:max-w-sm">
            <p className="font-medium">บัญชีสาธิต</p>
            <ul className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <li className="contents"><span>ลูกค้า</span><code className="font-mono">customer / customer1234</code></li>
              <li className="contents"><span>ผู้ดูแลระบบ</span><code className="font-mono">admin / admin1234</code></li>
              <li className="contents"><span>พนักงาน</span><code className="font-mono">staff / staff1234</code></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
