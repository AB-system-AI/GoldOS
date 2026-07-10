import { AuthError } from '@goldos/auth';

import { withPermission } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withPermission('tenant.hr.delete', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const params = await routeContext.params;
  const invitationId = params.invitationId;

  if (!invitationId) {
    return jsonError('VALIDATION_ERROR', 'Invitation ID required', requestId, { status: 400 });
  }

  try {
    const { invitationService } = getAuthContainer();
    await invitationService.cancel(invitationId, auth.tenantId, auth.user.id);
    return jsonOk({ cancelled: true, invitationId }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
