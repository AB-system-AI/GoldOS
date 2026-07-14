import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.purchasing.complete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { receiptId } = await routeContext.params;
    if (!receiptId) {
      return jsonError('VALIDATION_ERROR', 'Receipt ID required', requestId, { status: 400 });
    }
    const { goodsReceiptService } = getBusinessContainer();
    const receipt = await goodsReceiptService.receive(
      auth.tenantId,
      receiptId,
      buildAuditContext(request, auth),
    );
    return jsonOk({ receipt }, requestId);
  },
);
