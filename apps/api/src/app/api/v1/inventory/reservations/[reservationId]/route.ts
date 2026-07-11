import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { reservationId } = await routeContext.params;

    if (!reservationId) {
      return jsonError('VALIDATION_ERROR', 'Reservation ID required', requestId, { status: 400 });
    }

    const { reservationService } = getBusinessContainer();
    const reservation = await reservationService.getById(auth.tenantId, reservationId);

    return jsonOk({ reservation }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { reservationId } = await routeContext.params;

    if (!reservationId) {
      return jsonError('VALIDATION_ERROR', 'Reservation ID required', requestId, { status: 400 });
    }

    const { reservationService } = getBusinessContainer();
    const result = await reservationService.release(
      auth.tenantId,
      reservationId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
