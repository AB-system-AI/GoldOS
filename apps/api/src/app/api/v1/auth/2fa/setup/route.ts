import { AuthError } from '@goldos/auth';

import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);

  try {
    const { twoFactorService } = getAuthContainer();
    const result = await twoFactorService.setup(auth.user.id);
    return jsonOk({ secret: result.secret, uri: result.uri }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
});
