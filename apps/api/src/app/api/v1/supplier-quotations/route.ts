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
  const { supplierQuotationService } = getBusinessContainer();
  const supplierId = searchParams.get('supplierId') ?? undefined;
  const purchaseRfqId = searchParams.get('purchaseRfqId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const quotations = await supplierQuotationService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(supplierId ? { supplierId } : {}),
    ...(purchaseRfqId ? { purchaseRfqId } : {}),
    ...(status ? { status } : {}),
  });
  return jsonOk({ quotations }, requestId);
});

export const POST = withBusinessPermission('tenant.purchasing.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { supplierQuotationService } = getBusinessContainer();
  const quotation = await supplierQuotationService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );
  return jsonOk({ quotation }, requestId, { status: 201 });
});
