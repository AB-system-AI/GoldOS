import { randomBytes, timingSafeEqual } from 'crypto';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function validateCsrfToken(
  cookieToken: string | null | undefined,
  headerToken: string | null | undefined,
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return timingSafeEqual(cookieBuffer, headerBuffer);
}
