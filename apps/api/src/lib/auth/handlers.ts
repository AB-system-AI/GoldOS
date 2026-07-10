import {
  AuthError,
  optionalAuth,
  requireAuth,
  requireAnyPermission,
  requirePermission,
} from '@goldos/auth';
import type { AuthContext } from '@goldos/auth';

import { getAuthContext } from '@/lib/auth/context';
import { getRequestId } from '@/lib/http/request';
import { jsonError } from '@/lib/http/response';

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

type AuthedHandler = (
  request: Request,
  auth: AuthContext,
  routeContext: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

export function withAuth(handler: AuthedHandler, options?: { optional?: boolean }): RouteHandler {
  return async (request, routeContext) => {
    const requestId = getRequestId(request);

    try {
      const auth = await getAuthContext(request);

      if (options?.optional) {
        const optionalContext = optionalAuth(auth);
        if (!optionalContext) {
          return jsonError('UNAUTHORIZED', 'Authentication required', requestId, { status: 401 });
        }
        return await handler(request, optionalContext, routeContext);
      }

      const context = requireAuth(auth);
      return await handler(request, context, routeContext);
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonError(error.code, error.message, requestId, {
          status: error.statusCode,
          details: error.details,
        });
      }
      throw error;
    }
  };
}

export function withPermission(permission: string, handler: AuthedHandler): RouteHandler {
  return withAuth(async (request, auth, routeContext) => {
    requirePermission(auth, permission);
    return handler(request, auth, routeContext);
  });
}

export function withAnyPermission(permissions: string[], handler: AuthedHandler): RouteHandler {
  return withAuth(async (request, auth, routeContext) => {
    requireAnyPermission(auth, permissions);
    return handler(request, auth, routeContext);
  });
}
