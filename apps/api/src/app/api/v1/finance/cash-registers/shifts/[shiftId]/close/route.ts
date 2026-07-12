import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.finance.cash.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { shiftId } = await routeContext.params;

    if (!shiftId) {
      return jsonError('VALIDATION_ERROR', 'Shift ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { cashRegisterService } = getBusinessContainer();

    const shift = await cashRegisterService.closeShift(
      auth.tenantId,
      shiftId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ shift }, requestId);
  },
);
