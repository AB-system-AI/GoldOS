import { AUTH_CSRF_COOKIE_NAME } from '@goldos/auth/constants';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/password/reset-request',
  '/api/v1/auth/password/reset',
  '/api/v1/auth/email/verify',
  '/api/v1/auth/2fa/verify',
  '/api/v1/auth/invitations/accept',
];

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const isProduction = process.env.NODE_ENV === 'production';

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return match.slice(name.length + 1);
}

function validateCsrfToken(
  cookieToken: string | null | undefined,
  headerToken: string | null | undefined,
): boolean {
  if (!cookieToken?.length || !headerToken?.length || cookieToken.length !== headerToken.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < cookieToken.length; index += 1) {
    mismatch |= cookieToken.charCodeAt(index) ^ headerToken.charCodeAt(index);
  }

  return mismatch === 0;
}

function applySecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/v1') &&
    MUTATING_METHODS.has(request.method) &&
    !isPublicAuthPath(pathname)
  ) {
    const cookieToken = getCookieValue(request.headers.get('cookie'), AUTH_CSRF_COOKIE_NAME);
    const headerToken = request.headers.get('x-csrf-token');
    if (!validateCsrfToken(cookieToken, headerToken)) {
      const errorResponse = NextResponse.json(
        {
          error: {
            code: 'CSRF_INVALID',
            message: 'Invalid CSRF token',
            requestId: request.headers.get('x-request-id') ?? 'middleware',
          },
        },
        { status: 403 },
      );
      applySecurityHeaders(errorResponse);
      return errorResponse;
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
