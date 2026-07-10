import type { AuthContext } from '../types/index.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import { hasAnyPermission, hasPermission } from '../services/permission.service.js';

export function requirePermission(context: AuthContext, permission: string): AuthContext {
  if (!hasPermission(context.permissions, permission)) {
    throw new AuthError(AuthErrorCodes.PERMISSION_DENIED, `Missing permission: ${permission}`, {
      statusCode: 403,
    });
  }
  return context;
}

export function requireAnyPermission(context: AuthContext, permissions: string[]): AuthContext {
  if (!hasAnyPermission(context.permissions, permissions)) {
    throw new AuthError(AuthErrorCodes.PERMISSION_DENIED, 'Insufficient permissions', {
      statusCode: 403,
    });
  }
  return context;
}
