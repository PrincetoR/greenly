/** รวม class แบบง่าย ๆ ไม่ต้องพึ่ง clsx — ตัดค่า falsy ทิ้ง */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
