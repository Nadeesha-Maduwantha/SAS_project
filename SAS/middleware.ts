import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  const pathname = request.nextUrl.pathname;

  // Not authenticated - redirect to login
  if (!token) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/operation_user') || 
        pathname.startsWith('/sales_user') || pathname.startsWith('/super-user')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Authenticated but wrong role - redirect to their correct dashboard
  if (token && userRole) {
    if (pathname.startsWith('/admin') && userRole !== 'admin') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    if (pathname.startsWith('/super-user') && userRole !== 'super_user') {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url));
    }
    // Add similar checks for other roles...
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/operation_user/:path*', '/sales_user/:path*', '/super-user/:path*']
};