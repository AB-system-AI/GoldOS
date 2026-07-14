import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId') ?? undefined;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const { purchaseReportService } = getBusinessContainer();
  const summary = await purchaseReportService.purchaseSummary(auth.tenantId, {
    ...(branchId ? { branchId } : {}),
    ...(from ? { from: new Date(from) } : {}),
    ...(to ? { to: new Date(to) } : {}),
  });
  return jsonOk({ summary }, requestId);
});
