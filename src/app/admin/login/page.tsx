import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/db/settings';
import { LoginForm } from '@/components/admin/login-form';
import { Leaf } from 'lucide-react';

export const metadata = { title: 'เข้าสู่ระบบหลังบ้าน' };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  if (await getSession()) redirect('/admin');
  const { next } = await searchParams;
  const { storeName } = await getSettings();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
            <Leaf className="size-7" />
          </span>
          <h1 className="mt-2 text-2xl font-bold">{storeName}</h1>
          <p className="text-sm text-muted">ระบบหลังบ้าน</p>
        </div>
        <div className="mt-6 rounded-card bg-surface p-6 border border-line">
          <LoginForm next={typeof next === 'string' ? next : undefined} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          บัญชีสาธิต: admin / admin1234 · staff / staff1234 · customer / customer1234
        </p>
      </div>
    </main>
  );
}
