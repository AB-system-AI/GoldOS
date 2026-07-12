import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.accounting.close',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { periodId } = await routeContext.params;

    if (!periodId) {
      return jsonError('VALIDATION_ERROR', 'Period ID required', requestId, { status: 400 });
    }

    const { fiscalPeriodService } = getBusinessContainer();

    const period = await fiscalPeriodService.closePeriod(
      auth.tenantId,
      periodId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ period }, requestId);
  },
);
