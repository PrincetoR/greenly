import { NextResponse, type NextRequest } from 'next/server';
import { canAccessPath, isStaffRole } from '@/lib/auth/roles';
import { decodeToken } from '@/lib/auth/token';

const SESSION_COOKIE = 'ec_session';
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forbidden'];

/**
 * ด่านแรกของหลังบ้าน — ตรวจลายเซ็น cookie ตั้งแต่ชั้น request
 * ไม่อ่านไฟล์ users.json ที่นี่ (proxy ควรเบา) · layout/action ตรวจซ้ำกับข้อมูลจริงอีกชั้น
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

  const session = decodeToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // ลูกค้าที่ login (หน้าโปรไฟล์) หลงเข้า /admin → ส่งกลับโปรไฟล์ ไม่ใช่หน้า forbidden
  if (!isStaffRole(session.role)) return NextResponse.redirect(new URL('/account', request.url));
  if (!canAccessPath(session.role, pathname)) {
    return NextResponse.redirect(new URL('/admin/forbidden', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
