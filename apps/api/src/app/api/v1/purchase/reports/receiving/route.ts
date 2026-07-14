import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const { purchaseReportService } = getBusinessContainer();
  const receipts = await purchaseReportService.receivingReport(auth.tenantId, {
    ...(from ? { from: new Date(from) } : {}),
    ...(to ? { to: new Date(to) } : {}),
  });
  return jsonOk({ receipts }, requestId);
});
