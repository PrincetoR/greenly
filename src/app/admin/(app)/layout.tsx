import { requireSession } from '@/lib/auth/session';
import { visibleMenu } from '@/lib/auth/roles';
import { getSettings } from '@/lib/db/settings';
import { AdminShell } from '@/components/admin/shell';

/** ชั้นที่สอง — proxy กันมาแล้วชั้นหนึ่ง แต่ layout ต้องตรวจกับ users.json จริงอีกที */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireSession();
  const { storeName } = await getSettings();
  return (
    <AdminShell items={visibleMenu(session.role)} session={session} storeName={storeName}>
      {children}
    </AdminShell>
  );
}
