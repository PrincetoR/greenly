'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * ปุ่มย้อนกลับหน้าสินค้า (แทน breadcrumb — พี่ต่อสั่ง 2026-09-15): ย้อน history ถ้ามี ไม่มี (เปิดลิงก์ตรง) ไป fallback
 * overlay = วงกลมทึบลอยมุมซ้ายบนของรูป (มือถือ แบบ Shopee) · inline = ลูกศร + "กลับ" (จอใหญ่) · button = สี่เหลี่ยม 48 ไอคอนอย่างเดียว (แถบล่างมือถือ ข้างหัวใจ)
 */
export function BackButton({ variant = 'inline', fallback = '/products', className }: { variant?: 'overlay' | 'inline' | 'button'; fallback?: string; className?: string }) {
  const router = useRouter();
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button
      type="button"
      onClick={back}
      aria-label="ย้อนกลับ"
      className={cn(
        variant === 'overlay'
          ? 'absolute top-3 left-3 z-10 flex size-9 items-center justify-center rounded-full bg-ink/50 text-white backdrop-blur-sm'
          : variant === 'button'
            ? 'inline-flex size-12 shrink-0 items-center justify-center rounded-lg text-muted border border-line transition-colors hover:bg-surface-alt hover:text-ink'
            : 'inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink',
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
      {variant === 'inline' && 'กลับ'}
    </button>
  );
}
