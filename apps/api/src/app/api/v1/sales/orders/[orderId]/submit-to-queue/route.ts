import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { cashierQueueService } = getBusinessContainer();
    const entry = await cashierQueueService.submitFromSeller(
      auth.tenantId,
      { ...body, salesOrderId: orderId },
      buildAuditContext(request, auth),
    );

    return jsonOk({ entry }, requestId, { status: 201 });
  },
);
