import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.inventory.approve',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { adjustmentId } = await routeContext.params;

    if (!adjustmentId) {
      return jsonError('VALIDATION_ERROR', 'Adjustment ID required', requestId, { status: 400 });
    }

    const { inventoryAdjustmentService } = getBusinessContainer();

    const adjustment = await inventoryAdjustmentService.approve(
      auth.tenantId,
      adjustmentId,
      auth.user.id,
      buildAuditContext(request, auth),
    );

    return jsonOk({ adjustment }, requestId);
  },
);
