import { AuthError } from '@goldos/auth';
import type { EmployeeInvitation, InvitationStatus } from '@goldos/database';

import { withPermission } from '@/lib/auth/handlers';
import { invitationCreateSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withPermission('tenant.hr.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { invitationService } = getAuthContainer();
  const invitations = await invitationService.list(auth.tenantId);

  return jsonOk(
    {
      invitations: invitations.map((invitation: EmployeeInvitation) => ({
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        branchId: invitation.branchId,
        roleId: invitation.roleId,
      })),
    },
    requestId,
  );
});

export const POST = withPermission('tenant.hr.create', async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, invitationCreateSchema);
    const { invitationService } = getAuthContainer();

    const result = await invitationService.create({
      tenantId: auth.tenantId,
      createdById: auth.user.id,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      branchId: body.branchId,
      roleId: body.roleId,
      phone: body.phone,
      jobTitle: body.jobTitle,
      employeeId: body.employeeId,
    });

    return jsonOk(
      {
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          status: result.invitation.status as InvitationStatus,
          expiresAt: result.invitation.expiresAt.toISOString(),
        },
      },
      requestId,
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
