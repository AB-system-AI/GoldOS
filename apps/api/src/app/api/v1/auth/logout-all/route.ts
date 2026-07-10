import { withAuth } from '@/lib/auth/handlers';
import { clearAuthCookies } from '@/lib/auth/cookies';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);
  const { authService } = getAuthContainer();

  await authService.logoutAll(auth.user.id);

  const response = jsonOk({ loggedOutAll: true }, requestId);
  return clearAuthCookies(response);
});
