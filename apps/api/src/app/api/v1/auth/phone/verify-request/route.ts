import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { phoneVerifyRequestSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, phoneVerifyRequestSchema);
    const { verificationService } = getAuthContainer();
    const result = await verificationService.requestPhoneVerification(auth.user.id, body.phone);
    return jsonOk({ sent: result.sent }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
