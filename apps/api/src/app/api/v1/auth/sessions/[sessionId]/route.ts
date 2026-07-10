import { AuthError, AuthErrorCodes } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const DELETE = withAuth(async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const params = await routeContext.params;
  const sessionId = params.sessionId;

  if (!sessionId) {
    return jsonError('VALIDATION_ERROR', 'Session ID required', requestId, { status: 400 });
  }

  const { sessionService } = getAuthContainer();
  const sessions = await sessionService.listSessions(auth.user.id);
  const owned = sessions.some((session) => session.id === sessionId);

  if (!owned) {
    throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found', { statusCode: 404 });
  }

  await sessionService.revokeSession(sessionId);
  return jsonOk({ revoked: true, sessionId }, requestId);
});
