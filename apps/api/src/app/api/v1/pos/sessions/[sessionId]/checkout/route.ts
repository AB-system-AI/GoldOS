import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.create',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { sessionId } = await routeContext.params;

    if (!sessionId) {
      return jsonError('VALIDATION_ERROR', 'Session ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { posService } = getBusinessContainer();
    const result = await posService.checkout(
      auth.tenantId,
      sessionId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
