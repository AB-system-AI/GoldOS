import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId') ?? undefined;
  const { purchaseReportService } = getBusinessContainer();
  const orders = await purchaseReportService.openPurchaseOrders(auth.tenantId, branchId);
  return jsonOk({ orders }, requestId);
});
