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
  ratio = 'square',
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** square = รูปย่อ/แกลเลอรี · landscape (4:3) = การ์ดในกริด ให้ส่วนรูปไม่สูงจนข่มชื่อ/ราคา */
  ratio?: 'square' | 'landscape';
}) {
  const aspect = ratio === 'landscape' ? 'aspect-[4/3]' : 'aspect-square';
  if (!src) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-surface-alt text-muted', aspect, className)} aria-hidden>
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
      className={cn('shrink-0 bg-surface-alt object-cover', aspect, className)}
    />
  );
}
