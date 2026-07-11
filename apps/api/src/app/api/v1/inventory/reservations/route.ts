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
  const { reservationService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const inventoryItemId = searchParams.get('inventoryItemId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const reservations = await reservationService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(inventoryItemId ? { inventoryItemId } : {}),
    ...(status ? { status: status as 'ACTIVE' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED' } : {}),
  });

  return jsonOk({ reservations }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { reservationService } = getBusinessContainer();

  const reservation = await reservationService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ reservation }, requestId, { status: 201 });
});
