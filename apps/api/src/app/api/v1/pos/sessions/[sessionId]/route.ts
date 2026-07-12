import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.pos.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { sessionId } = await routeContext.params;

    if (!sessionId) {
      return jsonError('VALIDATION_ERROR', 'Session ID required', requestId, { status: 400 });
    }

    const { posService } = getBusinessContainer();
    const session = await posService.getSession(auth.tenantId, sessionId);

    return jsonOk({ session }, requestId);
  },
);
