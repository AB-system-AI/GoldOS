import type { AuthContext } from '@goldos/auth';

import { getRefreshTokenFromRequest } from '@/lib/auth/cookies';
import { getAuthContainer } from '@/lib/di';

function getAccessTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return null;
  }

  const refreshToken = getRefreshTokenFromRequest(request);
  const { authService } = getAuthContainer();
  return authService.resolveContextFromAccessToken(accessToken, refreshToken);
}
