import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.finance.view',
  async (request, _auth, routeContext) => {
    const requestId = getRequestId(request);
    const { currencyId } = await routeContext.params;

    if (!currencyId) {
      return jsonError('VALIDATION_ERROR', 'Currency ID required', requestId, { status: 400 });
    }

    const { currencyService } = getBusinessContainer();
    const currency = await currencyService.getById(currencyId);

    return jsonOk({ currency }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.finance.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { currencyId } = await routeContext.params;

    if (!currencyId) {
      return jsonError('VALIDATION_ERROR', 'Currency ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { currencyService } = getBusinessContainer();
    const audit = { ...buildAuditContext(request, auth), tenantId: auth.tenantId };

    const currency = await currencyService.update(currencyId, body, audit);

    return jsonOk({ currency }, requestId);
  },
);
