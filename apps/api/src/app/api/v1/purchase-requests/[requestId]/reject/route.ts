import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.purchasing.approve',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { requestId: purchaseRequestId } = await routeContext.params;

    if (!purchaseRequestId) {
      return jsonError('VALIDATION_ERROR', 'Request ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { purchaseRequestService } = getBusinessContainer();
    const purchaseRequest = await purchaseRequestService.reject(
      auth.tenantId,
      purchaseRequestId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ request: purchaseRequest }, requestId);
  },
);
