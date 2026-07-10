import { AuthError, generateCsrfToken } from '@goldos/auth';

import { getRefreshTokenFromRequest, setAuthCookies } from '@/lib/auth/cookies';
import { getAuthContext } from '@/lib/auth/context';
import { twoFactorVerifySchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getClientInfo, getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, twoFactorVerifySchema);
    const refreshToken = getRefreshTokenFromRequest(request);
    const clientInfo = getClientInfo(request);
    const { twoFactorService, authService } = getAuthContainer();

    if (refreshToken) {
      const loginResult = await authService.completeTwoFactorLogin(
        body.sessionId,
        body.code,
        refreshToken,
        clientInfo,
        requestId,
      );

      const response = jsonOk(
        {
          user: loginResult.user,
          tokens: {
            accessToken: loginResult.tokens.accessToken,
            expiresIn: loginResult.tokens.expiresIn,
          },
          sessionId: loginResult.sessionId,
        },
        requestId,
      );

      return setAuthCookies(response, loginResult.tokens.refreshToken, {
        csrfToken: generateCsrfToken(),
      });
    }

    const auth = await getAuthContext(request);
    if (!auth) {
      return jsonError('UNAUTHORIZED', 'Authentication required', requestId, { status: 401 });
    }

    await twoFactorService.verify(auth.user.id, body.code);
    return jsonOk({ verified: true }, requestId);
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
}
