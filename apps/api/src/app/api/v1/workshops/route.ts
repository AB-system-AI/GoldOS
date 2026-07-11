import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { workshopService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;

  const workshops = await workshopService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' } : {}),
  });

  return jsonOk({ workshops }, requestId);
});

export const POST = withBusinessPermission('tenant.hr.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { workshopService } = getBusinessContainer();

  const workshop = await workshopService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ workshop }, requestId, { status: 201 });
});
