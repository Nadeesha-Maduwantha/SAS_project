import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // TEMPORARY: middleware disabled. Remove this return to re-enable auth checks.
  return NextResponse.next();

  const pathname = request.nextUrl.pathname;

  // TEMPORARY: bypass auth for edit-user testing
  if (pathname.startsWith('/sales_user/edit-user')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

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
  // TEMPORARY: Empty matcher disables middleware for all routes so you can test anything
  matcher: []
};
