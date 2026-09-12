import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { ROLE_LABEL, visibleMenu } from '@/lib/auth/roles';
import { PageHeader } from '@/components/admin/page-header';

export const metadata = { title: 'แดชบอร์ด' };

export default async function AdminDashboard() {
  const session = await requireSession();
  const menu = visibleMenu(session.role).filter((m) => m.href !== '/admin');

  return (
    <div>
      <PageHeader title="แดชบอร์ด" description={`สวัสดี ${session.user.name} · ${ROLE_LABEL[session.role]}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {menu.map((m) => (
          <Link key={m.href} href={m.href} className="rounded-card bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-md">
            <p className="flex items-center gap-2 font-semibold">
              <span aria-hidden>{m.icon}</span>
              {m.label}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
