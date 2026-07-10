import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { twoFactorDisableSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, twoFactorDisableSchema);
    const { twoFactorService } = getAuthContainer();
    await twoFactorService.disable(auth.user.id, body.code);
    return jsonOk({ disabled: true }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
