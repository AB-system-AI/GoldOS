import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.sales.return', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { salesReturnService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const invoiceId = searchParams.get('invoiceId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const returns = await salesReturnService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(invoiceId ? { invoiceId } : {}),
    ...(status ? { status: status as never } : {}),
  });

  return jsonOk({ returns }, requestId);
});

export const POST = withBusinessPermission('tenant.sales.return', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { salesReturnService } = getBusinessContainer();

  const salesReturn = await salesReturnService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ return: salesReturn }, requestId, { status: 201 });
});
