import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const { purchaseOrderService } = getBusinessContainer();
    const order = await purchaseOrderService.getById(auth.tenantId, orderId);

    return jsonOk({ order }, requestId);
  },
);
