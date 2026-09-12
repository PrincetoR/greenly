import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * label + ช่องกรอก + คำอธิบาย/ข้อผิดพลาด — ช่องกรอกส่ง input/select/textarea เข้ามาเป็น children
 * สไตล์ของช่องกรอกอยู่ใน globals.css แล้ว ไม่ต้องใส่ class ที่ input
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
