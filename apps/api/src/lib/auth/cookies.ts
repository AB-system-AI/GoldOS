import {
  AUTH_CSRF_COOKIE_NAME,
  AUTH_REFRESH_TOKEN_TTL_SECONDS,
  AUTH_REMEMBER_ME_TTL_SECONDS,
  AUTH_SESSION_COOKIE_NAME,
} from '@goldos/auth';

const isProduction = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  response: Response,
  refreshToken: string,
  options?: { rememberMe?: boolean; csrfToken?: string },
): Response {
  const maxAge = options?.rememberMe
    ? AUTH_REMEMBER_ME_TTL_SECONDS
    : AUTH_REFRESH_TOKEN_TTL_SECONDS;
  const maxAgeValue = String(maxAge);

  const headers = new Headers(response.headers);
  headers.append(
    'Set-Cookie',
    `${AUTH_SESSION_COOKIE_NAME}=${refreshToken}; HttpOnly; Path=/; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=${maxAgeValue}`,
  );

  if (options?.csrfToken) {
    headers.append(
      'Set-Cookie',
      `${AUTH_CSRF_COOKIE_NAME}=${options.csrfToken}; HttpOnly; Path=/; SameSite=Lax${isProduction ? '; Secure' : ''}; Max-Age=${maxAgeValue}`,
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearAuthCookies(response: Response): Response {
  const headers = new Headers(response.headers);
  const expired = 'Max-Age=0';

  headers.append(
    'Set-Cookie',
    `${AUTH_SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax${isProduction ? '; Secure' : ''}; ${expired}`,
  );
  headers.append(
    'Set-Cookie',
    `${AUTH_CSRF_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax${isProduction ? '; Secure' : ''}; ${expired}`,
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);
    cookies[key] = value;
  }
  return cookies;
}

export function getRefreshTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);

  return cookies[AUTH_SESSION_COOKIE_NAME] ?? null;
}

export { AUTH_CSRF_COOKIE_NAME, AUTH_SESSION_COOKIE_NAME };
