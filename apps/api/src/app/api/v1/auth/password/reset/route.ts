import { AuthError } from '@goldos/auth';

import { passwordResetSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, passwordResetSchema);
    const { verificationService } = getAuthContainer();
    await verificationService.confirmPasswordReset(body.token, body.password);
    return jsonOk({ reset: true }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
}
