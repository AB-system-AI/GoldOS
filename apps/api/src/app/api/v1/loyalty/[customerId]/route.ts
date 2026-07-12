import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.sales.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const { loyaltyService } = getBusinessContainer();
    const account = await loyaltyService.getAccount(auth.tenantId, customerId);

    return jsonOk({ account }, requestId);
  },
);
