import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { ROLE_LABEL } from '@/lib/auth/roles';
import { buttonStyles } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export const metadata = { title: 'ไม่มีสิทธิ์เข้าถึง' };

export default async function ForbiddenPage() {
  const session = await getSession();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-surface-alt text-muted" aria-hidden>
        <Lock className="size-8" />
      </span>
      <h1 className="mt-4 text-2xl font-bold">ไม่มีสิทธิ์เข้าถึงส่วนนี้</h1>
      <p className="mt-2 max-w-sm text-muted">
        {session
          ? `บัญชีของคุณเป็น "${ROLE_LABEL[session.role]}" ซึ่งเข้าหน้านี้ไม่ได้ หากต้องการสิทธิ์เพิ่ม ติดต่อผู้ดูแลระบบ`
          : 'กรุณาเข้าสู่ระบบก่อน'}
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/admin" className={buttonStyles()}>
          ไปแดชบอร์ด
        </Link>
        <Link href="/" className={buttonStyles({ variant: 'secondary' })}>
          กลับหน้าร้าน
        </Link>
      </div>
    </main>
  );
}
