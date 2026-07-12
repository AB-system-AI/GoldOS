import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.sales.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const { salesOrderService } = getBusinessContainer();
    const order = await salesOrderService.getById(auth.tenantId, orderId);

    return jsonOk({ order }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.sales.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { salesOrderService } = getBusinessContainer();
    const order = await salesOrderService.update(
      auth.tenantId,
      orderId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ order }, requestId);
  },
);
