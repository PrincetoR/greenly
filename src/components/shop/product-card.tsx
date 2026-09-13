import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatBaht } from '@/lib/money';
import { ProductImage } from '@/components/product-image';
import { Badge } from '@/components/ui/badge';
import { WishlistButton } from './wishlist-button';

/**
 * การ์ดสินค้าในกริด — ราคาที่แสดงส่งมาจากผู้เรียก (หลังคิดโปรแล้ว) ผ่าน priceSlot
 * ปุ่มหัวใจอยู่นอก <Link> (ซ้อนด้วย absolute) เพื่อไม่ให้กดแล้วเปิดหน้าสินค้า
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
    <div className="group relative">
      <Link href={`/product/${product.slug}`} className="flex h-full flex-col overflow-hidden rounded-card bg-surface ring-1 ring-line transition-shadow hover:shadow-lg">
        <div className="relative overflow-hidden">
          <ProductImage src={product.images[0]} alt={product.name} priority={priority} className="w-full transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">{badge}</div>
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Badge tone="neutral" className="bg-ink text-white">
                สินค้าหมด
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
          <div className="mt-auto pt-2">{priceSlot ?? <p className="font-bold">{formatBaht(product.price)}</p>}</div>
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <WishlistButton productId={product.id} saved={wishlisted} />
      </div>
    </div>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
