import type { AuthContext } from '@goldos/auth';
import { BusinessError } from '@goldos/business';

import { withAnyPermission, withPermission } from '@/lib/auth/handlers';
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

function handleBusinessError(error: unknown, requestId: string): Response | null {
  if (error instanceof BusinessError) {
    return jsonError(error.code, error.message, requestId, {
      status: error.statusCode,
      details: error.details,
    });
  }
  return null;
}
export function withBusinessAnyPermission(
  permissions: string[],
  handler: AuthedHandler,
): RouteHandler {
  return withAnyPermission(permissions, async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    try {
      return await handler(request, auth, routeContext);
    } catch (error) {
      const response = handleBusinessError(error, requestId);
      if (response) {
        return response;
      }
      throw error;
    }
  });
}

export function withBusinessPermission(permission: string, handler: AuthedHandler): RouteHandler {
  return withPermission(permission, async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    try {
      return await handler(request, auth, routeContext);
    } catch (error) {
      const response = handleBusinessError(error, requestId);
      if (response) {
        return response;
      }
      throw error;
    }
  });
}
