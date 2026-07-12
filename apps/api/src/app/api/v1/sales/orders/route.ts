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
  const { salesOrderService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const paymentStatus = searchParams.get('paymentStatus') ?? undefined;

  const orders = await salesOrderService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
  });

  return jsonOk({ orders }, requestId);
});

export const POST = withBusinessPermission('tenant.sales.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { salesOrderService } = getBusinessContainer();

  const order = await salesOrderService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ order }, requestId, { status: 201 });
});
