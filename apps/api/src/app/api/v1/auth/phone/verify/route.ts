import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { phoneVerifySchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, phoneVerifySchema);
    const { verificationService } = getAuthContainer();
    await verificationService.confirmPhoneVerification(auth.user.id, body.phone, body.code);
    return jsonOk({ verified: true }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
