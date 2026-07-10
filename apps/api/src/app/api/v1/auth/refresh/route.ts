import { AuthError, generateCsrfToken } from '@goldos/auth';

import { getRefreshTokenFromRequest, setAuthCookies } from '@/lib/auth/cookies';
import { getAuthContainer } from '@/lib/di';
import { getClientInfo, getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      return jsonError('INVALID_TOKEN', 'Refresh token required', requestId, { status: 401 });
    }

    const { authService } = getAuthContainer();
    const clientInfo = getClientInfo(request);
    const result = await authService.refresh(refreshToken, clientInfo);

    const response = jsonOk(
      {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          expiresIn: result.tokens.expiresIn,
        },
        sessionId: result.sessionId,
      },
      requestId,
    );

    return setAuthCookies(response, result.tokens.refreshToken, {
      csrfToken: generateCsrfToken(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, { status: error.statusCode });
    }
    throw error;
  }
}
