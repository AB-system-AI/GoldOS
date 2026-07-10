import { SignJWT, jwtVerify } from 'jose';

import { AUTH_ACCESS_TOKEN_TTL_SECONDS } from '../constants/index.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import { generateSecureToken, hashToken } from './password.js';

export { generateSecureToken, hashToken };

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
  email: string;
  type: 'access';
}

export async function createAccessToken(
  payload: Omit<AccessTokenPayload, 'type'>,
  secret: string,
  ttlSeconds = AUTH_ACCESS_TOKEN_TTL_SECONDS,
): Promise<string> {
  const key = new TextEncoder().encode(secret);

  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${String(ttlSeconds)}s`)
    .setSubject(payload.sub)
    .sign(key);
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });

    if (payload.type !== 'access' || typeof payload.sub !== 'string') {
      throw new AuthError(AuthErrorCodes.INVALID_TOKEN, 'Invalid access token');
    }

    return {
      sub: payload.sub,
      tenantId: String(payload.tenantId),
      sessionId: String(payload.sessionId),
      email: String(payload.email),
      type: 'access',
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(AuthErrorCodes.INVALID_TOKEN, 'Invalid or expired access token', {
      cause: error,
    });
  }
}

export function createRefreshToken(): string {
  return generateSecureToken(48);
}
