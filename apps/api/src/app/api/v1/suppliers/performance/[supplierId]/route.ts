import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;
    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }
    const { supplierPerformanceService } = getBusinessContainer();
    const performance = await supplierPerformanceService.getPerformance(auth.tenantId, supplierId);
    return jsonOk({ performance }, requestId);
  },
);
