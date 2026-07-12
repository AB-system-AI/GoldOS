import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.exchange.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { exchangeId } = await routeContext.params;

    if (!exchangeId) {
      return jsonError('VALIDATION_ERROR', 'Exchange ID required', requestId, { status: 400 });
    }

    const { salesExchangeService } = getBusinessContainer();
    const exchange = await salesExchangeService.getById(auth.tenantId, exchangeId);

    return jsonOk({ exchange }, requestId);
  },
);
