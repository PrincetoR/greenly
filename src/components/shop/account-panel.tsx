'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogIn, User, UserPlus } from 'lucide-react';
import { LoginForm } from '@/components/admin/login-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * หน้าโปรไฟล์ 2 บาน (พี่ต่อสั่ง 2026-09-15): บานซ้าย = โปรไฟล์ (children จาก server) · กด "เข้าสู่ระบบ" แล้ว
 * เลื่อนไปทางซ้ายเผยบานขวา = ฟอร์ม login — header/แถบเมนูล่างอยู่ที่เดิม ไม่พาไปหน้าอื่น
 * login สำเร็จ: ลูกค้า → กลับ /account (server render ใหม่เป็นโหมด customer) · พนักงาน → /admin · บานที่ซ่อนใส่ inert กันโฟกัสหลง
 * โฟกัสช่องชื่อผู้ใช้เองด้วย preventScroll — autoFocus ธรรมดาจะทำให้ container overflow-hidden เลื่อน scrollLeft ไปอีก 1 บาน (เลื่อนซ้อนกับ translate → จอว่าง)
 * ปุ่ม "สมัครสมาชิก" บนสุด + login ด้วย Facebook/Google/Apple = **ปุ่มหลอก** (พี่ต่อสั่ง 2026-09-15 — สาธิตว่าไม่ต้องสมัครก็เข้าได้) กดแล้วแค่แจ้งว่ายังไม่เปิดใช้
 * `initialOpen` (?login=1 จากแถบสถานะ) = เปิดบาน login ทันที
 */
export function AccountPanel({ name, sub, guest, initialOpen = false, children }: { name: string; sub: string; guest: boolean; initialOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(guest && initialOpen);
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const fake = (what: string) => setNote(`${what} — ปุ่มสาธิต ยังไม่เชื่อมต่อ ใช้บัญชีสาธิตด้านล่างได้เลย`);

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
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (initialOpen) router.replace('/account');
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" aria-hidden />
              กลับไปโปรไฟล์
            </button>
            {/* ปุ่มหลอก: สมัครสมาชิก (บนสุด) */}
            <Button variant="secondary" size="sm" onClick={() => fake('สมัครสมาชิก')}>
              <UserPlus className="size-4" aria-hidden />
              สมัครสมาชิก
            </Button>
          </div>
          {/* card เดียว กว้างเท่าโปรไฟล์ (พี่ต่อ: เดิม max-w-sm เบี้ยว): ซ้าย = ฟอร์มชื่อผู้ใช้ · ขวา = ปุ่มบัญชีอื่น · มือถือซ้อนกัน */}
          <div className="mt-4 grid gap-6 rounded-card bg-surface p-5 border border-line md:grid-cols-2 md:gap-0 md:p-6">
            <div className="md:pr-6">
              <h2 className="text-lg font-bold">เข้าสู่ระบบ</h2>
              <p className="mt-0.5 mb-4 text-sm text-muted">ด้วยชื่อผู้ใช้และรหัสผ่าน</p>
              {/* mount เฉพาะตอนเปิด — ฟอร์มสั้น ไม่ต้องอยู่ใน DOM ตลอด */}
              {open && <LoginForm autoFocus={false} />}
            </div>
            <div className="border-t border-line pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
              <h2 className="text-lg font-bold">เข้าด้วยบัญชีอื่น</h2>
              <p className="mt-0.5 mb-4 text-sm text-muted">เข้าได้เลยไม่ต้องสมัครสมาชิก</p>
              {/* ปุ่มหลอก: login ด้วยบัญชีอื่น */}
              <div className="grid gap-2" role="group" aria-label="เข้าสู่ระบบด้วยบัญชีอื่น (สาธิต)">
                <SocialButton label="เข้าสู่ระบบด้วย Facebook" onClick={() => fake('เข้าสู่ระบบด้วย Facebook')}>
                  <svg viewBox="0 0 24 24" className="size-5 text-[#1877F2]" aria-hidden><path fill="currentColor" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12" /></svg>
                </SocialButton>
                <SocialButton label="เข้าสู่ระบบด้วย Google" onClick={() => fake('เข้าสู่ระบบด้วย Google')}>
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24" /><path fill="#FBBC04" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8" /></svg>
                </SocialButton>
                <SocialButton label="เข้าสู่ระบบด้วย Apple" onClick={() => fake('เข้าสู่ระบบด้วย Apple')}>
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="currentColor" d="M16.4 12.7c0-2.5 2-3.7 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1-2.8-4.2M14 5.4c.7-.8 1.2-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.5 2.9-1.3" /></svg>
                </SocialButton>
              </div>
              {note && (
                <p role="status" className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-xs text-muted">
                  {note}
                </p>
              )}
            </div>
          </div>
          {/* บัญชีสาธิตทั้ง 3 role พร้อมรหัส (พี่ต่อสั่ง 2026-09-15) */}
          <div className="mt-3 text-xs text-muted">
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

/** ปุ่ม login ด้วยบัญชีอื่น (สาธิต) — ไอคอนซ้าย ข้อความกึ่งกลาง */
function SocialButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="relative flex h-11 w-full items-center justify-center rounded-lg bg-surface px-4 text-sm font-medium border border-line transition-colors hover:bg-surface-alt">
      <span className="absolute left-4 flex items-center" aria-hidden>
        {children}
      </span>
      {label}
    </button>
  );
}
