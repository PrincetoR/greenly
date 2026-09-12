'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { addToCart, type CartActionState } from '@/lib/actions/cart';
import { Button, buttonStyles } from '@/components/ui/button';

/**
 * ตัวเลือกจำนวน + ปุ่มใส่ตะกร้า — บนมือถือถูกวางไว้ในแถบ sticky ด้านล่าง
 * ข้อความตอบกลับแสดงในที่เดียวกัน ไม่เด้งไปหน้าตะกร้าเพื่อให้เลือกซื้อต่อได้
 */
export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(addToCart, {});
  const [qty, setQty] = useState(1);
  const soldOut = stock <= 0;
  const max = Math.min(stock, 99);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-3">
        <div className="flex h-11 items-center rounded-lg ring-1 ring-line">
          <button type="button" aria-label="ลดจำนวน" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={soldOut || qty <= 1} className="size-11 text-lg disabled:opacity-40">
            −
          </button>
          <input
            type="number"
            name="qty"
            value={qty}
            min={1}
            max={max}
            onChange={(e) => setQty(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
            aria-label="จำนวน"
            className="h-11 w-14 border-0! text-center ring-0!"
            disabled={soldOut}
          />
          <button type="button" aria-label="เพิ่มจำนวน" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={soldOut || qty >= max} className="size-11 text-lg disabled:opacity-40">
            ＋
          </button>
        </div>
        <Button type="submit" size="lg" disabled={soldOut || pending} className="flex-1">
          {soldOut ? 'สินค้าหมด' : pending ? 'กำลังใส่ตะกร้า…' : '🛒 ใส่ตะกร้า'}
        </Button>
      </div>
      {state.message && (
        <p role="status" className={`flex flex-wrap items-center gap-2 text-sm ${state.ok ? 'text-ok' : 'text-danger'}`}>
          {state.message}
          {state.ok && (
            <Link href="/cart" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              ไปที่ตะกร้า →
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
