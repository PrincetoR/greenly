'use client';

import type { SelectHTMLAttributes } from 'react';

/** select ที่ submit ฟอร์มทันทีเมื่อเปลี่ยนค่า — ปุ่ม "อัปเดต" ยังมีไว้เผื่อ JS ไม่ทำงาน */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
