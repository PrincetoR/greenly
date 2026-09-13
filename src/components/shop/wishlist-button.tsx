'use client';

import { useActionState, useOptimistic } from 'react';
import { Heart } from 'lucide-react';
import { toggleWishlist, type WishlistState } from '@/lib/actions/wishlist';
import { cn } from '@/lib/cn';

/**
 * ปุ่มหัวใจ — สลับสถานะทันที (optimistic) แล้วให้ server ยืนยัน
 * variant "overlay" = ปุ่มกลมเล็กบนการ์ดสินค้า · "button" = ปุ่มสี่เหลี่ยม 48px ข้างปุ่มใส่ตะกร้าในหน้าสินค้า (ไอคอนอย่างเดียว)
 */
export function WishlistButton({ productId, saved, variant = 'overlay' }: { productId: string; saved: boolean; variant?: 'overlay' | 'button' }) {
  const [state, action, pending] = useActionState<WishlistState, FormData>(toggleWishlist, { saved });
  const [optimistic, setOptimistic] = useOptimistic(state.saved);
  const label = optimistic ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด';

  return (
    <form
      action={(fd) => {
        setOptimistic(!optimistic);
        action(fd);
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        aria-label={label}
        aria-pressed={optimistic}
        title={label}
        disabled={pending}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-colors',
          variant === 'overlay'
            ? 'size-9 rounded-full border border-line hover:bg-surface-alt'
            : 'size-12 rounded-lg border border-line hover:bg-surface-alt',
          optimistic ? 'text-accent' : 'text-muted hover:text-accent',
        )}
      >
        <Heart className="size-5" fill={optimistic ? 'currentColor' : 'none'} aria-hidden />

      </button>
    </form>
  );
}
