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
  const { purchaseInvoiceService } = getBusinessContainer();
  const supplierId = searchParams.get('supplierId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const invoices = await purchaseInvoiceService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(supplierId ? { supplierId } : {}),
    ...(status ? { status } : {}),
  });
  return jsonOk({ invoices }, requestId);
});

export const POST = withBusinessPermission('tenant.purchasing.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { purchaseInvoiceService } = getBusinessContainer();
  const invoice = await purchaseInvoiceService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );
  return jsonOk({ invoice }, requestId, { status: 201 });
});
