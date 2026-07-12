import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.accounting.post',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { purchaseOrderId } = await routeContext.params;

    if (!purchaseOrderId) {
      return jsonError('VALIDATION_ERROR', 'Purchase order ID required', requestId, {
        status: 400,
      });
    }

    const body: unknown = await request.json().catch(() => ({}));
    const { purchaseOrderService } = getBusinessContainer();
    const order = await purchaseOrderService.complete(
      auth.tenantId,
      purchaseOrderId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ order }, requestId);
  },
);
