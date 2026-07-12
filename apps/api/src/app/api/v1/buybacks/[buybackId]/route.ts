import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.sales.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { buybackId } = await routeContext.params;

    if (!buybackId) {
      return jsonError('VALIDATION_ERROR', 'Buyback ID required', requestId, { status: 400 });
    }

    const { buybackService } = getBusinessContainer();
    const buyback = await buybackService.getById(auth.tenantId, buybackId);

    return jsonOk({ buyback }, requestId);
  },
);
