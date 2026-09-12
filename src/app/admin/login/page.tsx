import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/db/settings';
import { LoginForm } from '@/components/admin/login-form';

export const metadata = { title: 'เข้าสู่ระบบหลังบ้าน' };

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  if (await getSession()) redirect('/admin');
  const { next } = await searchParams;
  const { storeName } = await getSettings();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="text-3xl" aria-hidden>
            🌿
          </p>
          <h1 className="mt-2 text-2xl font-bold">{storeName}</h1>
          <p className="text-sm text-muted">ระบบหลังบ้าน</p>
        </div>
        <div className="mt-6 rounded-card bg-surface p-6 ring-1 ring-line">
          <LoginForm next={typeof next === 'string' ? next : undefined} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          บัญชีสาธิต: admin / admin1234 · staff / staff1234
        </p>
      </div>
    </main>
  );
}
