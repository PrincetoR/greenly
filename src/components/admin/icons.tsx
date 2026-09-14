import { CreditCard, FolderOpen, Images, LayoutDashboard, Package, Receipt, Settings, Tag, Truck, Users, type LucideProps } from 'lucide-react';
import type { AdminIconName } from '@/lib/auth/roles';

/** ไอคอนเมนูหลังบ้าน — roles.ts เก็บแค่ชื่อ (pure module) ส่วน component อยู่ที่นี่ */
const ICONS: Record<AdminIconName, React.ComponentType<LucideProps>> = {
  dashboard: LayoutDashboard,
  products: Package,
  categories: FolderOpen,
  promotions: Tag,
  homepage: Images,
  orders: Receipt,
  shipping: Truck,
  payments: CreditCard,
  users: Users,
  settings: Settings,
};

export function AdminIcon({ name, ...props }: LucideProps & { name: AdminIconName }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden {...props} />;
}
