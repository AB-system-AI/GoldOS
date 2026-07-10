import { AuthError } from '@goldos/auth';

import { emailVerifySchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, emailVerifySchema);
    const { verificationService } = getAuthContainer();
    await verificationService.confirmEmailVerification(body.token);
    return jsonOk({ verified: true }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
}
