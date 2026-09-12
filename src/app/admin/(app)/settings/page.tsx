import { requirePermission } from '@/lib/auth/session';
import { getSettings } from '@/lib/db/settings';
import { PageHeader } from '@/components/admin/page-header';
import { SettingsForm } from '@/components/admin/settings-form';

export const metadata = { title: 'ตั้งค่าร้าน' };

export default async function SettingsPage() {
  await requirePermission('settings.manage');
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="ตั้งค่าร้าน" description="ชื่อร้าน ค่าจัดส่ง และช่องทางติดต่อ — มีผลกับหน้าร้านทันที" />
      <SettingsForm settings={settings} />
    </div>
  );
}
