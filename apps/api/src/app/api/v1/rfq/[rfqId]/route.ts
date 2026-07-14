import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { rfqId } = await routeContext.params;

    if (!rfqId) {
      return jsonError('VALIDATION_ERROR', 'RFQ ID required', requestId, { status: 400 });
    }

    const { purchaseRfqService } = getBusinessContainer();
    const rfq = await purchaseRfqService.getById(auth.tenantId, rfqId);

    return jsonOk({ rfq }, requestId);
  },
);
