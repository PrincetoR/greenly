'use client';

import { useActionState } from 'react';
import { applyCoupon, removeCoupon, type CartActionState } from '@/lib/actions/cart';
import type { Quote } from '@/lib/pricing/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { Check } from 'lucide-react';

/** ช่องกรอกคูปอง — ผลลัพธ์อ่านจาก quote.coupon ที่ server คิดมา ไม่เดาเองฝั่ง client */
export function CouponBox({ coupon }: { coupon: Quote['coupon'] }) {
  const [, action, pending] = useActionState<CartActionState, FormData>(applyCoupon, {});
  const applied = coupon?.status === 'applied';

  if (applied) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5">
          <Check className="size-4 shrink-0" aria-hidden />
          <span>
            ใช้คูปอง <b className="font-mono">{coupon.code}</b> — {coupon.message}
          </span>
        </span>
        <form action={removeCoupon}>
          <button type="submit" className="text-xs text-muted underline hover:text-ink">
            นำออก
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input name="code" defaultValue={coupon?.code ?? ''} placeholder="โค้ดคูปอง" aria-label="โค้ดคูปอง" className="font-mono uppercase" autoCapitalize="characters" />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? '…' : 'ใช้โค้ด'}
        </Button>
      </div>
      {coupon && (
        <p role="alert" className={cn('text-xs', coupon.status === 'applied' ? 'text-ok' : 'text-danger')}>
          {coupon.message}
        </p>
      )}
    </form>
  );
}
