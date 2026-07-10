import { AuthError, generateCsrfToken } from '@goldos/auth';

import { setAuthCookies } from '@/lib/auth/cookies';
import { loginSchema } from '@/lib/auth/schemas';
import { getAuthContainer } from '@/lib/di';
import { getClientInfo, getRequestId, parseJsonBody } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request);

  try {
    const body = await parseJsonBody(request, loginSchema);
    const clientInfo = getClientInfo(request);
    const { authService } = getAuthContainer();

    const result = await authService.login(body, clientInfo, requestId);

    if (result.type === 'two_factor_required') {
      const response = jsonOk(
        {
          twoFactorRequired: true,
          challenge: {
            sessionId: result.challenge.sessionId,
            method: result.challenge.method,
            expiresAt: result.challenge.expiresAt.toISOString(),
          },
        },
        requestId,
      );
      return setAuthCookies(response, result.refreshToken, {
        rememberMe: body.rememberMe,
        csrfToken: generateCsrfToken(),
      });
    }

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
      rememberMe: body.rememberMe,
      csrfToken: generateCsrfToken(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonError(error.code, error.message, requestId, {
        status: error.statusCode,
        details: error.details,
      });
    }
    throw error;
  }
}
