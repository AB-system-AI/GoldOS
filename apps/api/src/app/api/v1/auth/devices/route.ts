import { withAuth } from '@/lib/auth/handlers';
import { getAuthContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withAuth(async (request, auth) => {
  const requestId = getRequestId(request);
  const { deviceService } = getAuthContainer();
  const devices = await deviceService.list(auth.user.id, auth.tenantId);
  return jsonOk({ devices }, requestId);
});
