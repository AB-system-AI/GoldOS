import type { AuthContext } from '../types/index.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';

export function requireAuth(context: AuthContext | null | undefined): AuthContext {
  if (!context) {
    throw new AuthError(AuthErrorCodes.INVALID_TOKEN, 'Authentication required', {
      statusCode: 401,
    });
  }
  return context;
}

export function optionalAuth(context: AuthContext | null | undefined): AuthContext | null {
  return context ?? null;
}
