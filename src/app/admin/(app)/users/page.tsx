import { requirePermission } from '@/lib/auth/session';
import { listUsers } from '@/lib/db/users';
import { ROLE_LABEL } from '@/lib/auth/roles';
import { toggleUserActive } from '@/lib/actions/users';
import { formatDate } from '@/lib/datetime';
import { PageHeader } from '@/components/admin/page-header';
import { AddUserForm, ResetPasswordForm } from '@/components/admin/user-forms';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'ผู้ใช้' };

export default async function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const session = await requirePermission('user.manage');
  const sp = await searchParams;
  const users = await listUsers();

  return (
    <div>
      <PageHeader title="ผู้ใช้หลังบ้าน" description="admin เข้าถึงทุกส่วน · staff จัดการสินค้า หมวดหมู่ และคำสั่งซื้อ" />
      {sp.saved && <Alert tone="ok" className="mb-4">เพิ่มผู้ใช้แล้ว</Alert>}
      {sp.error === 'self' && <Alert tone="danger" className="mb-4">ปิดบัญชีตัวเองไม่ได้</Alert>}
      {sp.error === 'lastadmin' && <Alert tone="danger" className="mb-4">ต้องมี admin ที่ใช้งานได้อย่างน้อย 1 คน</Alert>}

      <Card className="mb-6">
        <CardHeader title="เพิ่มผู้ใช้ใหม่" />
        <div className="p-5">
          <AddUserForm />
        </div>
      </Card>

      <ul className="flex flex-col gap-2">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {u.name}
                <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
                {!u.active && <Badge tone="danger">ปิดใช้งาน</Badge>}
                {u.id === session.user.id && <Badge tone="info">คุณ</Badge>}
              </p>
              <p className="text-xs text-muted">
                @{u.username} · สร้าง {formatDate(u.createdAt)}
              </p>
            </div>
            <ResetPasswordForm userId={u.id} />
            <form action={toggleUserActive}>
              <input type="hidden" name="id" value={u.id} />
              <Button type="submit" variant={u.active ? 'ghost' : 'primary'} size="sm" disabled={u.id === session.user.id}>
                {u.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
