import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.inventory.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { inventoryItemService } = getBusinessContainer();

  const inventoryItemId = searchParams.get('inventoryItemId') ?? undefined;
  const lockType = searchParams.get('lockType') ?? undefined;
  const activeOnly = searchParams.get('activeOnly');

  const locks = await inventoryItemService.listLocks(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(inventoryItemId ? { inventoryItemId } : {}),
    ...(lockType
      ? {
          lockType: lockType as 'STOCK_COUNT' | 'TRANSFER' | 'REPAIR' | 'INVESTIGATION' | 'MANUAL',
        }
      : {}),
    ...(activeOnly !== null ? { activeOnly: activeOnly === 'true' } : {}),
  });

  return jsonOk({ locks }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { inventoryItemService } = getBusinessContainer();

  const lock = await inventoryItemService.acquireLock(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ lock }, requestId, { status: 201 });
});

export const DELETE = withBusinessPermission('tenant.inventory.delete', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return jsonError('VALIDATION_ERROR', 'Lock ID required', requestId, { status: 400 });
  }

  const { inventoryItemService } = getBusinessContainer();
  const result = await inventoryItemService.releaseLock(
    auth.tenantId,
    id,
    buildAuditContext(request, auth),
  );

  return jsonOk(result, requestId);
});
