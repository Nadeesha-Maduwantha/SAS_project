import { NextRequest, NextResponse } from 'next/server';

// Role values as returned by the backend (Backend/routes/user_edit.py,
// Backend/routes/users.py, Backend/routes/dashboard.py) — lowercase, no
// separators. Each maps to the path prefix of that role's protected pages.
const ROLE_PATH_PREFIXES: Record<string, string> = {
  admin: '/admin',
  superuser: '/Super_user',
  operationuser: '/operation_user',
  salesuser: '/sales_user',
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPrefixes = Object.values(ROLE_PATH_PREFIXES);
  const matchedPrefix = protectedPrefixes.find((prefix) => pathname.startsWith(prefix));

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value?.toLowerCase();

  // Not authenticated - redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Authenticated but wrong role - redirect to their correct dashboard
  if (userRole) {
    const ownPrefix = ROLE_PATH_PREFIXES[userRole];
    if (ownPrefix && ownPrefix !== matchedPrefix) {
      return NextResponse.redirect(new URL(`${ownPrefix}/dashboard`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/Super_user/:path*', '/operation_user/:path*', '/sales_user/:path*'],
};
