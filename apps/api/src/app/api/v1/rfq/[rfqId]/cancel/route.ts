import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.purchasing.cancel',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { rfqId } = await routeContext.params;

    if (!rfqId) {
      return jsonError('VALIDATION_ERROR', 'RFQ ID required', requestId, { status: 400 });
    }

    const { purchaseRfqService } = getBusinessContainer();
    const rfq = await purchaseRfqService.cancel(
      auth.tenantId,
      rfqId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ rfq }, requestId);
  },
);
