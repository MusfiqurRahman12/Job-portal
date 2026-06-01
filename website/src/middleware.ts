import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only apply HTTP Basic Auth to the /admin and /api/admin paths
  if (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/api/admin')) {
    const basicAuth = req.headers.get('authorization');
    const url = req.nextUrl;

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      const adminUser = process.env.ADMIN_USERNAME || 'admin';
      const adminPwd = process.env.ADMIN_PASSWORD;

      if (!adminPwd) {
        console.warn('ADMIN_PASSWORD is not set in environment variables');
        // If no password is set, deny access completely to be safe
        return new NextResponse('Admin password not configured on server', { status: 403 });
      }

      if (user === adminUser && pwd === adminPwd) {
        return NextResponse.next();
      }
    }

    url.pathname = '/api/auth';
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
