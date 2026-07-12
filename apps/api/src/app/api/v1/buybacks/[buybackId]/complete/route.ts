import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.buyback.create',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { buybackId } = await routeContext.params;

    if (!buybackId) {
      return jsonError('VALIDATION_ERROR', 'Buyback ID required', requestId, { status: 400 });
    }

    const { buybackService } = getBusinessContainer();
    const buyback = await buybackService.complete(
      auth.tenantId,
      buybackId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ buyback }, requestId);
  },
);
