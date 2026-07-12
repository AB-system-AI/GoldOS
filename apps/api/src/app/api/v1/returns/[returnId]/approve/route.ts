import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.approve',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { returnId } = await routeContext.params;

    if (!returnId) {
      return jsonError('VALIDATION_ERROR', 'Return ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { salesReturnService } = getBusinessContainer();
    const salesReturn = await salesReturnService.approve(
      auth.tenantId,
      returnId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ return: salesReturn }, requestId);
  },
);
