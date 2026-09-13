'use client';

import { useActionState, useOptimistic } from 'react';
import { Heart } from 'lucide-react';
import { toggleWishlist, type WishlistState } from '@/lib/actions/wishlist';
import { cn } from '@/lib/cn';

/**
 * ปุ่มหัวใจ — สลับสถานะทันที (optimistic) แล้วให้ server ยืนยัน
 * วางซ้อนบนการ์ดสินค้าได้ (variant "overlay") หรือเป็นปุ่มเต็มข้างปุ่มใส่ตะกร้า (variant "button")
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
            ? 'size-9 rounded-full bg-surface/90 shadow-sm ring-1 ring-line backdrop-blur hover:bg-surface'
            : 'h-12 rounded-lg px-4 text-sm font-semibold ring-1 ring-line hover:bg-surface-alt',
          optimistic ? 'text-accent' : 'text-muted hover:text-accent',
        )}
      >
        <Heart className="size-5" fill={optimistic ? 'currentColor' : 'none'} aria-hidden />
        {variant === 'button' && <span className="hidden sm:inline">{optimistic ? 'อยู่ในรายการโปรด' : 'รายการโปรด'}</span>}
      </button>
    </form>
  );
}
