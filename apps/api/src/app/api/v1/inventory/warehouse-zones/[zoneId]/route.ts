import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { zoneId } = await routeContext.params;

    if (!zoneId) {
      return jsonError('VALIDATION_ERROR', 'Warehouse zone ID required', requestId, {
        status: 400,
      });
    }

    const { warehouseZoneService } = getBusinessContainer();
    const warehouseZone = await warehouseZoneService.getById(auth.tenantId, zoneId);

    return jsonOk({ warehouseZone }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { zoneId } = await routeContext.params;

    if (!zoneId) {
      return jsonError('VALIDATION_ERROR', 'Warehouse zone ID required', requestId, {
        status: 400,
      });
    }

    const body: unknown = await request.json();
    const { warehouseZoneService } = getBusinessContainer();

    const warehouseZone = await warehouseZoneService.update(
      auth.tenantId,
      zoneId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ warehouseZone }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { zoneId } = await routeContext.params;

    if (!zoneId) {
      return jsonError('VALIDATION_ERROR', 'Warehouse zone ID required', requestId, {
        status: 400,
      });
    }

    const { warehouseZoneService } = getBusinessContainer();
    const result = await warehouseZoneService.delete(
      auth.tenantId,
      zoneId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
