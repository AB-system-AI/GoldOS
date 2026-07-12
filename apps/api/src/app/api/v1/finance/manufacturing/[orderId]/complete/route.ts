import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.accounting.post',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { manufacturingOrderService } = getBusinessContainer();
    const order = await manufacturingOrderService.complete(
      auth.tenantId,
      orderId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ order }, requestId);
  },
);
