import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const DELETE = withAuth(async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const params = await routeContext.params;
  const deviceId = params.deviceId;

  if (!deviceId) {
    return jsonError('VALIDATION_ERROR', 'Device ID required', requestId, { status: 400 });
  }

  try {
    const { deviceService } = getAuthContainer();
    await deviceService.revoke(auth.user.id, deviceId);
    return jsonOk({ revoked: true, deviceId }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
