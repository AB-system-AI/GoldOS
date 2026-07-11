import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.finance.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { rateId } = await routeContext.params;

    if (!rateId) {
      return jsonError('VALIDATION_ERROR', 'Exchange rate ID required', requestId, { status: 400 });
    }

    const { exchangeRateService } = getBusinessContainer();
    const exchangeRate = await exchangeRateService.getById(auth.tenantId, rateId);

    return jsonOk({ exchangeRate }, requestId);
  },
);
