import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * รูปสินค้า — ใช้ <img> ธรรมดาแทน next/image เพราะไฟล์ถูกอัปโหลดตอน runtime
 * และ seed เป็น SVG ซึ่ง image optimizer ไม่รับ · ผู้เรียกกำหนดขนาดผ่าน className (ค่าเริ่มต้น w-full)
 */
export function ProductImage({
  src,
  alt,
  className = 'w-full',
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn('flex aspect-square shrink-0 items-center justify-center bg-surface-alt text-muted', className)} aria-hidden>
        <ShoppingBag className="size-[30%]" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('aspect-square shrink-0 bg-surface-alt object-cover', className)}
    />
  );
}
