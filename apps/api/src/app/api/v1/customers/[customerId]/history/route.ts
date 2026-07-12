import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.crm.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const { customerSalesHistoryService } = getBusinessContainer();
    const history = await customerSalesHistoryService.getHistory(auth.tenantId, customerId);

    return jsonOk({ history }, requestId);
  },
);
