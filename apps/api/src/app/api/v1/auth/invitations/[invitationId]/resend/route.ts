import { AuthError } from '@goldos/auth';
import type { InvitationStatus } from '@goldos/database';

import { withPermission } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withPermission('tenant.hr.update', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const params = await routeContext.params;
  const invitationId = params.invitationId;

  if (!invitationId) {
    return jsonError('VALIDATION_ERROR', 'Invitation ID required', requestId, { status: 400 });
  }

  try {
    const { invitationService } = getAuthContainer();
    const result = await invitationService.resend(invitationId, auth.tenantId, auth.user.id);

    return jsonOk(
      {
        invitation: {
          id: result.invitation.id,
          status: result.invitation.status as InvitationStatus,
          resendCount: result.invitation.resendCount,
        },
      },
      requestId,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
