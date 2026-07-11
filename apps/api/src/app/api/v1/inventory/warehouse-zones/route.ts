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
  const { warehouseZoneService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const isActive = searchParams.get('isActive');

  const warehouseZones = await warehouseZoneService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ warehouseZones }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { warehouseZoneService } = getBusinessContainer();

  const warehouseZone = await warehouseZoneService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ warehouseZone }, requestId, { status: 201 });
});
