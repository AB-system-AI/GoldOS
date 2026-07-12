import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.invoice.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { invoiceService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const customerId = searchParams.get('customerId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const paymentStatus = searchParams.get('paymentStatus') ?? undefined;

  const invoices = await invoiceService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(paymentStatus ? { paymentStatus: paymentStatus as never } : {}),
  });

  return jsonOk({ invoices }, requestId);
});

export const POST = withBusinessPermission('tenant.invoice.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { invoiceService } = getBusinessContainer();

  const invoice = await invoiceService.createFromOrder(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ invoice }, requestId, { status: 201 });
});
