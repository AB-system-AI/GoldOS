import { clearAuthCookies } from '@/lib/auth/cookies';
import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);
  const { authService } = getAuthContainer();

  await authService.logout(auth.session.id);

  const response = jsonOk({ loggedOut: true }, requestId);
  return clearAuthCookies(response);
});

export function OPTIONS(): Response {
  return new Response(null, { status: 204 });
}
