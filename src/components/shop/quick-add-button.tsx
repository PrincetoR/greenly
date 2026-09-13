'use client';

import { useRef, useState, useTransition } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { addToCart } from '@/lib/actions/cart';
import { cn } from '@/lib/cn';

/**
 * ปุ่มใส่ตะกร้าบนการ์ดสินค้า — ใส่ทีละ 1 ชิ้นโดยไม่ต้องเข้าหน้าสินค้า
 * สำเร็จแล้วโชว์เครื่องหมายถูก 1.5 วิ (badge ตะกร้าใน header อัปเดตเองจาก revalidatePath)
 */
export function QuickAddButton({ productId, soldOut }: { productId: string; soldOut: boolean }) {
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = (formData: FormData) =>
    start(async () => {
      const result = await addToCart({}, formData);
      if (!result.ok) {
        setError(result.message ?? 'ใส่ตะกร้าไม่สำเร็จ');
        return;
      }
      setError(null);
      setFlash(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFlash(false), 1500);
    });

  const label = soldOut ? 'สินค้าหมด' : flash ? 'ใส่ตะกร้าแล้ว' : 'ใส่ตะกร้า';
  return (
    <form action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="qty" value="1" />
      <button
        type="submit"
        aria-label={label}
        title={error ?? label}
        disabled={soldOut || pending}
        className={cn(
          'flex size-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
          flash ? 'bg-ok text-white' : 'bg-brand text-white hover:bg-brand-hover',
        )}
      >
        {flash ? <Check className="size-4" aria-hidden /> : <ShoppingCart className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
