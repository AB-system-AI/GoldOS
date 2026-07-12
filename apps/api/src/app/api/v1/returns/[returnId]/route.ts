import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.sales.return',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { returnId } = await routeContext.params;

    if (!returnId) {
      return jsonError('VALIDATION_ERROR', 'Return ID required', requestId, { status: 400 });
    }

    const { salesReturnService } = getBusinessContainer();
    const salesReturn = await salesReturnService.getById(auth.tenantId, returnId);

    return jsonOk({ return: salesReturn }, requestId);
  },
);
