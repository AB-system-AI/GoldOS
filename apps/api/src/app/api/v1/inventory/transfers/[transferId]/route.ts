import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { transferId } = await routeContext.params;

    if (!transferId) {
      return jsonError('VALIDATION_ERROR', 'Transfer ID required', requestId, { status: 400 });
    }

    const { transferService } = getBusinessContainer();
    const transfer = await transferService.getById(auth.tenantId, transferId);

    return jsonOk({ transfer }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { transferId } = await routeContext.params;

    if (!transferId) {
      return jsonError('VALIDATION_ERROR', 'Transfer ID required', requestId, { status: 400 });
    }

    const { transferService } = getBusinessContainer();

    const transfer = await transferService.submit(
      auth.tenantId,
      transferId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ transfer }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { transferId } = await routeContext.params;

    if (!transferId) {
      return jsonError('VALIDATION_ERROR', 'Transfer ID required', requestId, { status: 400 });
    }

    const { transferService } = getBusinessContainer();
    const result = await transferService.delete(
      auth.tenantId,
      transferId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
