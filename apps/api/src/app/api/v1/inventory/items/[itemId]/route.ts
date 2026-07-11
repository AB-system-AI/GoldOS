import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { itemId } = await routeContext.params;

    if (!itemId) {
      return jsonError('VALIDATION_ERROR', 'Item ID required', requestId, { status: 400 });
    }

    const { inventoryItemService } = getBusinessContainer();
    const item = await inventoryItemService.getById(auth.tenantId, itemId);

    return jsonOk({ item }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { itemId } = await routeContext.params;

    if (!itemId) {
      return jsonError('VALIDATION_ERROR', 'Item ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { inventoryItemService } = getBusinessContainer();

    const item = await inventoryItemService.update(
      auth.tenantId,
      itemId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ item }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { itemId } = await routeContext.params;

    if (!itemId) {
      return jsonError('VALIDATION_ERROR', 'Item ID required', requestId, { status: 400 });
    }

    const { inventoryItemService } = getBusinessContainer();
    const result = await inventoryItemService.delete(
      auth.tenantId,
      itemId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
