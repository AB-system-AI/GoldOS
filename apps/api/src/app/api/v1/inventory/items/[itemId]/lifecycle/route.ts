import { buildAuditContext } from '@/lib/business/context';
import { parsePagination } from '@/lib/business/filters';
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

    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const { inventoryItemService } = getBusinessContainer();

    const history = await inventoryItemService.listLifecycleHistory(auth.tenantId, itemId, {
      ...pagination,
    });

    return jsonOk({ history }, requestId);
  },
);

export const POST = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { itemId } = await routeContext.params;

    if (!itemId) {
      return jsonError('VALIDATION_ERROR', 'Item ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { inventoryItemService } = getBusinessContainer();

    const event = await inventoryItemService.transitionLifecycle(
      auth.tenantId,
      itemId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ event }, requestId);
  },
);
