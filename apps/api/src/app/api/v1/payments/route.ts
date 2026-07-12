import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { paymentService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const invoiceId = searchParams.get('invoiceId') ?? undefined;

  const payments = await paymentService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(invoiceId ? { invoiceId } : {}),
  });

  return jsonOk({ payments }, requestId);
});

export const POST = withBusinessPermission('tenant.payment.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { paymentService } = getBusinessContainer();

  const payment = await paymentService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ payment }, requestId, { status: 201 });
});
