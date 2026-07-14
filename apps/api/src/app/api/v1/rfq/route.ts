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
  const { purchaseRfqService } = getBusinessContainer();
  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const rfqs = await purchaseRfqService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(status ? { status } : {}),
  });
  return jsonOk({ rfqs }, requestId);
});

export const POST = withBusinessPermission('tenant.purchasing.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { purchaseRfqService } = getBusinessContainer();
  const rfq = await purchaseRfqService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );
  return jsonOk({ rfq }, requestId, { status: 201 });
});
