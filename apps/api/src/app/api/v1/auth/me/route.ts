import { withAuth } from '@/lib/auth/handlers';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);
  await Promise.resolve();
  return jsonOk({ user: auth.user, session: auth.session }, requestId);
});
