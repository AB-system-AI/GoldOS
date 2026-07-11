import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.inventory.approve',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { transferId } = await routeContext.params;

    if (!transferId) {
      return jsonError('VALIDATION_ERROR', 'Transfer ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { transferService } = getBusinessContainer();

    const transfer = await transferService.reject(
      auth.tenantId,
      transferId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ transfer }, requestId);
  },
);
