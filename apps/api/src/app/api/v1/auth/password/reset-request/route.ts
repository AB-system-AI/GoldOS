import { AuthError } from '@goldos/auth';

import { passwordResetRequestSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getClientInfo, getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, passwordResetRequestSchema);
    const clientInfo = getClientInfo(request);
    const { verificationService } = getAuthContainer();

    const result = await verificationService.requestPasswordReset(
      body.email,
      body.tenantSlug,
      clientInfo,
    );

    return jsonOk({ sent: result.sent }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
}
