import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatBaht } from '@/lib/money';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from './wishlist-button';
import { QuickAddButton } from './quick-add-button';

/**
 * การ์ดสินค้าในกริด — ราคาที่แสดงส่งมาจากผู้เรียก (หลังคิดโปรแล้ว) ผ่าน priceSlot
 * แถวล่าง: ราคา · หัวใจ · ใส่ตะกร้า — อยู่นอก <Link> เพื่อกดแล้วไม่เปิดหน้าสินค้า
 */
export function ProductCard({
  product,
  priority,
  priceSlot,
  badge,
  wishlisted = false,
}: {
  product: Product;
  priority?: boolean;
  priceSlot?: React.ReactNode;
  badge?: React.ReactNode;
  wishlisted?: boolean;
}) {
  const soldOut = product.stock <= 0;
  return (
    <div className="group flex flex-col overflow-hidden rounded-card bg-surface ring-1 ring-line transition-shadow hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative overflow-hidden">
          <ProductImage src={product.images[0]} alt={product.name} priority={priority} ratio="landscape" className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">{badge}</div>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Badge tone="neutral" className="bg-ink text-white">
                สินค้าหมด
              </Badge>
            </div>
          )}
        </div>
        <h3 className="line-clamp-2 px-3 pt-3 text-sm font-medium leading-snug">{product.name}</h3>
      </Link>
      <div className="flex items-end justify-between gap-2 px-3 pt-2 pb-3">
        <div className="min-w-0">{priceSlot ?? <p className="font-bold">{formatBaht(product.price)}</p>}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <WishlistButton productId={product.id} saved={wishlisted} />
          <QuickAddButton productId={product.id} soldOut={soldOut} />
        </div>
      </div>
    </div>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
