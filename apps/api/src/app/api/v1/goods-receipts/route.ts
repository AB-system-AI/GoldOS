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
  const { goodsReceiptService } = getBusinessContainer();
  const purchaseOrderId = searchParams.get('purchaseOrderId') ?? undefined;
  const supplierId = searchParams.get('supplierId') ?? undefined;
  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const receipts = await goodsReceiptService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(purchaseOrderId ? { purchaseOrderId } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(status ? { status } : {}),
  });
  return jsonOk({ receipts }, requestId);
});

export const POST = withBusinessPermission('tenant.purchasing.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { goodsReceiptService } = getBusinessContainer();
  const receipt = await goodsReceiptService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );
  return jsonOk({ receipt }, requestId, { status: 201 });
});
