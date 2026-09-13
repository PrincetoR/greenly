import 'server-only';
import { cookies } from 'next/headers';

/**
 * ค่าที่ลูกค้าเลือกเกี่ยวกับการแสดงผล — เก็บใน cookie ธรรมดา (client เขียนเอง)
 * อ่านฝั่ง server ตอน render เพื่อให้หน้าออกมาถูกแบบตั้งแต่แรก ไม่กระพริบ
 */
export const CATEGORY_LAYOUT_COOKIE = 'ec_catlayout';
export type CategoryLayout = 'chips' | 'aside';

export async function readCategoryLayout(): Promise<CategoryLayout> {
  const v = (await cookies()).get(CATEGORY_LAYOUT_COOKIE)?.value;
  return v === 'aside' ? 'aside' : 'chips';
}
