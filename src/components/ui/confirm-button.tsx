'use client';

import { Button, type ButtonProps } from './button';

/** ปุ่ม submit ที่ถามยืนยันก่อน — ใช้กับ action ที่ย้อนกลับไม่ได้ (ลบ, ยกเลิก order) */
export function ConfirmButton({ message, onClick, ...rest }: ButtonProps & { message: string }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
