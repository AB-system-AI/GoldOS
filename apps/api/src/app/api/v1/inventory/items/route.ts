import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.inventory.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { inventoryItemService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const productId = searchParams.get('productId') ?? undefined;
  const inventoryLotId = searchParams.get('inventoryLotId') ?? undefined;
  const warehouseZoneId = searchParams.get('warehouseZoneId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const lifecycleStage = searchParams.get('lifecycleStage') ?? undefined;
  const barcode = searchParams.get('barcode') ?? undefined;
  const assetId = searchParams.get('assetId') ?? undefined;
  const serialNumber = searchParams.get('serialNumber') ?? undefined;

  const items = await inventoryItemService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(productId ? { productId } : {}),
    ...(inventoryLotId ? { inventoryLotId } : {}),
    ...(warehouseZoneId ? { warehouseZoneId } : {}),
    ...(barcode ? { barcode } : {}),
    ...(assetId ? { assetId } : {}),
    ...(serialNumber ? { serialNumber } : {}),
    ...(status
      ? {
          status: status as
            | 'AVAILABLE'
            | 'RESERVED'
            | 'SOLD'
            | 'IN_TRANSIT'
            | 'DAMAGED'
            | 'QUARANTINE'
            | 'RETURNED',
        }
      : {}),
    ...(lifecycleStage
      ? {
          lifecycleStage: lifecycleStage as
            | 'RECEIVED'
            | 'AVAILABLE'
            | 'RESERVED'
            | 'WITH_SALES'
            | 'PENDING_PAYMENT'
            | 'SOLD'
            | 'RETURNED'
            | 'TRANSFERRED'
            | 'IN_TRANSIT'
            | 'IN_WORKSHOP'
            | 'REPAIR'
            | 'MANUFACTURING'
            | 'BUYBACK'
            | 'TRADE_IN'
            | 'DAMAGED'
            | 'LOST'
            | 'ARCHIVED',
        }
      : {}),
  });

  return jsonOk({ items }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { inventoryItemService } = getBusinessContainer();

  const item = await inventoryItemService.receive(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ item }, requestId, { status: 201 });
});
