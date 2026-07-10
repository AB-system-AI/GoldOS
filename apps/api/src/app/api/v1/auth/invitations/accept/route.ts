import { AuthError } from '@goldos/auth';

import { invitationAcceptSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getClientInfo, getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, invitationAcceptSchema);
    const clientInfo = getClientInfo(request);
    const { invitationService } = getAuthContainer();

    const result = await invitationService.accept({
      token: body.token,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
      clientInfo,
    });

    return jsonOk(
      {
        userId: result.user.id,
        employeeId: result.employeeId,
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
}
