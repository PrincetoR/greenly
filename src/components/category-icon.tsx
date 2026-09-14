import { Apple, Baby, Carrot, Cherry, Coffee, Cookie, CookingPot, CupSoda, Dumbbell, Gift, Heart, Home, Leaf, Package, Pill, Shirt, ShoppingBag, Sparkles, Utensils, Wheat, type LucideProps } from 'lucide-react';
import type { CategoryIconName } from '@/lib/types';

const ICONS: Record<CategoryIconName, React.ComponentType<LucideProps>> = {
  'cup-soda': CupSoda,
  coffee: Coffee,
  wheat: Wheat,
  cookie: Cookie,
  apple: Apple,
  cherry: Cherry,
  carrot: Carrot,
  pill: Pill,
  'cooking-pot': CookingPot,
  utensils: Utensils,
  leaf: Leaf,
  sparkles: Sparkles,
  heart: Heart,
  gift: Gift,
  'shopping-bag': ShoppingBag,
  package: Package,
  shirt: Shirt,
  baby: Baby,
  dumbbell: Dumbbell,
  home: Home,
};

/** ไอคอนหมวดหมู่ (SVG จาก lucide) — ไม่มีชื่อ = ถุงช้อปปิ้ง */
export function CategoryIcon({ icon, ...props }: LucideProps & { icon: CategoryIconName | null | undefined }) {
  const Icon = (icon && ICONS[icon]) || ShoppingBag;
  return <Icon aria-hidden {...props} />;
}
