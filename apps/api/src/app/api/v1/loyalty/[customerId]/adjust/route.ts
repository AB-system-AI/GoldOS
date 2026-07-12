import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { loyaltyService } = getBusinessContainer();
    const transaction = await loyaltyService.manualAdjust(
      auth.tenantId,
      { ...body, customerId },
      buildAuditContext(request, auth),
    );

    return jsonOk({ transaction }, requestId);
  },
);
