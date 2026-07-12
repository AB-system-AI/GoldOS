import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.sales.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { buybackService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const buybacks = await buybackService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(status ? { status: status as never } : {}),
  });

  return jsonOk({ buybacks }, requestId);
});

export const POST = withBusinessPermission('tenant.buyback.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { buybackService } = getBusinessContainer();

  const buyback = await buybackService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ buyback }, requestId, { status: 201 });
});
