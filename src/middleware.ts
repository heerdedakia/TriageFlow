import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  const path = request.nextUrl.pathname;

  const isPublicRoute = path === '/login' || path === '/register' || path.startsWith('/status/');

  if (!sessionToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionToken) {
    const session = await decrypt(sessionToken);

    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    if (isPublicRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Role check for Admin route
    if (path.startsWith('/admin') && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const response = NextResponse.next();
  // Content Security Policy (CSP) header for basic protection
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
