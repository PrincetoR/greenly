import type { Product } from '@/lib/types';
import type { PromotionContext } from '@/lib/promotions/service';
import { displayPrice } from '@/lib/pricing/quote';
import { ProductCard } from './product-card';
import { PriceTag } from './price-tag';
import { PromoBadge } from './promo-badge';

/** การ์ดสินค้าที่คิดราคาโปรแล้ว — ใช้แทน ProductCard ทุกที่ที่มี PromotionContext */
export function PromoProductCard({ product, ctx, priority }: { product: Product; ctx: PromotionContext; priority?: boolean }) {
  const d = displayPrice(product, ctx.promotions, ctx.usage, ctx.now);
  return (
    <ProductCard
      product={product}
      priority={priority}
      wishlisted={ctx.wishlist.includes(product.id)}
      priceSlot={<PriceTag price={d.price} original={d.original} />}
      badge={
        <>
          {d.promotion && <PromoBadge promotion={d.promotion} />}
          {d.bogo && <PromoBadge promotion={d.bogo} />}
        </>
      }
    />
  );
}
