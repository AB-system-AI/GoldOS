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
  const { stockCountService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const isCycleCount = searchParams.get('isCycleCount');

  const stockCounts = await stockCountService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(status
      ? {
          status: status as 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED',
        }
      : {}),
    ...(isCycleCount !== null ? { isCycleCount: isCycleCount === 'true' } : {}),
  });

  return jsonOk({ stockCounts }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { stockCountService } = getBusinessContainer();

  const stockCount = await stockCountService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ stockCount }, requestId, { status: 201 });
});
