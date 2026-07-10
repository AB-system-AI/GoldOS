import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const { verificationService } = getAuthContainer();
    const result = await verificationService.requestEmailVerification(auth.user.id);
    return jsonOk({ sent: result.sent }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
