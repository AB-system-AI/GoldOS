import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.exchange.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { salesExchangeService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const exchanges = await salesExchangeService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(status ? { status: status as never } : {}),
  });

  return jsonOk({ exchanges }, requestId);
});

export const POST = withBusinessPermission('tenant.exchange.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { salesExchangeService } = getBusinessContainer();

  const exchange = await salesExchangeService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ exchange }, requestId, { status: 201 });
});
