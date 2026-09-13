'use client';

import { useActionState } from 'react';
import { addToCart, type CartActionState } from '@/lib/actions/cart';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

/**
 * ปุ่มใส่ตะกร้าในหน้าสินค้า — ใส่ทีละ 1 ชิ้น (พี่ต่อเอาตัวเลือกจำนวนออก ปรับจำนวนที่หน้าตะกร้าแทน)
 * บนมือถือถูกวางไว้ในแถบ sticky ด้านล่าง · ข้อความตอบกลับแสดงในที่เดียวกัน ไม่เด้งไปหน้าตะกร้า
 */
export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const [state, action, pending] = useActionState<CartActionState, FormData>(addToCart, {});
  const soldOut = stock <= 0;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value="1" />
      <Button type="submit" size="lg" disabled={soldOut || pending} className="w-full">
        {soldOut ? (
          'สินค้าหมด'
        ) : pending ? (
          'กำลังใส่ตะกร้า…'
        ) : (
          <>
            <ShoppingCart className="size-5" aria-hidden />
            ใส่ตะกร้า
          </>
        )}
      </Button>
      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? 'text-ok' : 'text-danger'}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
