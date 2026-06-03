import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function getExpectedToken(): Promise<string> {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'password';
  const msgBuffer = new TextEncoder().encode(`${username}:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect administrative API routes, except the auth route itself
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/auth') {
    const adminSessionCookie = req.cookies.get('admin_session');
    const expectedToken = await getExpectedToken();

    if (!adminSessionCookie || adminSessionCookie.value !== expectedToken) {
      return NextResponse.json(
        { error: 'Authentication Required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
