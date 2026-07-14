import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.purchasing.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { requestId: purchaseRequestId } = await routeContext.params;

    if (!purchaseRequestId) {
      return jsonError('VALIDATION_ERROR', 'Request ID required', requestId, { status: 400 });
    }

    const { purchaseRequestService } = getBusinessContainer();
    const purchaseRequest = await purchaseRequestService.cancel(
      auth.tenantId,
      purchaseRequestId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ request: purchaseRequest }, requestId);
  },
);
