import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { supplierPerformanceService } = getBusinessContainer();
  const leadTimes = await supplierPerformanceService.leadTimeReport(auth.tenantId);
  return jsonOk({ leadTimes }, requestId);
});
