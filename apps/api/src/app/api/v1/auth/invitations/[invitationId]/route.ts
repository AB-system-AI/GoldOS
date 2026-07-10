import { AuthError } from '@goldos/auth';
import type { InvitationStatus } from '@goldos/database';

import { withPermission } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withPermission('tenant.hr.view', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const params = await routeContext.params;
  const invitationId = params.invitationId;

  if (!invitationId) {
    return jsonError('VALIDATION_ERROR', 'Invitation ID required', requestId, { status: 400 });
  }

  try {
    const { invitationService } = getAuthContainer();
    const invitation = await invitationService.getById(invitationId, auth.tenantId);

    return jsonOk(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          status: invitation.status as InvitationStatus,
          expiresAt: invitation.expiresAt.toISOString(),
          branchId: invitation.branchId,
          roleId: invitation.roleId,
          employeeId: invitation.employeeId,
          createdAt: invitation.createdAt.toISOString(),
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
