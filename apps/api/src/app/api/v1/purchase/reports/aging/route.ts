import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { purchaseReportService } = getBusinessContainer();
  const aging = await purchaseReportService.purchaseAging(auth.tenantId);
  return jsonOk({ aging }, requestId);
});
