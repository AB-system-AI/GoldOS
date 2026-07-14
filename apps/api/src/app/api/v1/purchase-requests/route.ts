import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { purchaseRequestService } = getBusinessContainer();
  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const requests = await purchaseRequestService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(status ? { status } : {}),
  });
  return jsonOk({ requests }, requestId);
});

export const POST = withBusinessPermission('tenant.purchasing.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { purchaseRequestService } = getBusinessContainer();
  const purchaseRequest = await purchaseRequestService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );
  return jsonOk({ request: purchaseRequest }, requestId, { status: 201 });
});
