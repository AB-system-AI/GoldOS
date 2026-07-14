import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { receiptId } = await routeContext.params;

    if (!receiptId) {
      return jsonError('VALIDATION_ERROR', 'Receipt ID required', requestId, { status: 400 });
    }

    const { goodsReceiptService } = getBusinessContainer();
    const receipt = await goodsReceiptService.getById(auth.tenantId, receiptId);

    return jsonOk({ receipt }, requestId);
  },
);
