import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.exchange.complete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { exchangeId } = await routeContext.params;

    if (!exchangeId) {
      return jsonError('VALIDATION_ERROR', 'Exchange ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json().catch(() => ({}));
    const { salesExchangeService } = getBusinessContainer();
    const exchange = await salesExchangeService.complete(
      auth.tenantId,
      exchangeId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ exchange }, requestId);
  },
);
