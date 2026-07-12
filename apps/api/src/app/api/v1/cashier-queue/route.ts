import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.pos.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { cashierQueueService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const cashierEmployeeId = searchParams.get('cashierEmployeeId') ?? undefined;

  const entries = await cashierQueueService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(cashierEmployeeId ? { cashierEmployeeId } : {}),
  });

  return jsonOk({ entries }, requestId);
});
