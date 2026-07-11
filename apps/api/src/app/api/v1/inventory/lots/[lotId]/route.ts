import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { lotId } = await routeContext.params;

    if (!lotId) {
      return jsonError('VALIDATION_ERROR', 'Lot ID required', requestId, { status: 400 });
    }

    const { inventoryLotService } = getBusinessContainer();
    const lot = await inventoryLotService.getById(auth.tenantId, lotId);

    return jsonOk({ lot }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { lotId } = await routeContext.params;

    if (!lotId) {
      return jsonError('VALIDATION_ERROR', 'Lot ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { inventoryLotService } = getBusinessContainer();

    const lot = await inventoryLotService.update(
      auth.tenantId,
      lotId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ lot }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { lotId } = await routeContext.params;

    if (!lotId) {
      return jsonError('VALIDATION_ERROR', 'Lot ID required', requestId, { status: 400 });
    }

    const { inventoryLotService } = getBusinessContainer();
    const result = await inventoryLotService.delete(
      auth.tenantId,
      lotId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
