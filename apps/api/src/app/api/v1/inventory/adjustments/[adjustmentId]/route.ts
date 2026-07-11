import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { adjustmentId } = await routeContext.params;

    if (!adjustmentId) {
      return jsonError('VALIDATION_ERROR', 'Adjustment ID required', requestId, { status: 400 });
    }

    const { inventoryAdjustmentService } = getBusinessContainer();
    const adjustment = await inventoryAdjustmentService.getById(auth.tenantId, adjustmentId);

    return jsonOk({ adjustment }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { adjustmentId } = await routeContext.params;

    if (!adjustmentId) {
      return jsonError('VALIDATION_ERROR', 'Adjustment ID required', requestId, { status: 400 });
    }

    const { inventoryAdjustmentService } = getBusinessContainer();

    const adjustment = await inventoryAdjustmentService.submit(
      auth.tenantId,
      adjustmentId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ adjustment }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { adjustmentId } = await routeContext.params;

    if (!adjustmentId) {
      return jsonError('VALIDATION_ERROR', 'Adjustment ID required', requestId, { status: 400 });
    }

    const { inventoryAdjustmentService } = getBusinessContainer();
    const result = await inventoryAdjustmentService.delete(
      auth.tenantId,
      adjustmentId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
