'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * ปุ่มย้อนกลับหน้าสินค้า (แทน breadcrumb — พี่ต่อสั่ง 2026-09-15): ย้อน history ถ้ามี ไม่มี (เปิดลิงก์ตรง) ไป fallback
 * overlay = วงกลมทึบลอยมุมซ้ายบนของรูป (มือถือ แบบ Shopee) · inline = ลูกศร + "กลับ" (จอใหญ่)
 */
export function BackButton({ variant = 'inline', fallback = '/products', className }: { variant?: 'overlay' | 'inline'; fallback?: string; className?: string }) {
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
          : 'inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink',
        className,
      )}
    >
      <ArrowLeft className="size-5" aria-hidden />
      {variant === 'inline' && 'กลับ'}
    </button>
  );
}
