import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.pos.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { entryId } = await routeContext.params;

    if (!entryId) {
      return jsonError('VALIDATION_ERROR', 'Entry ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { cashierQueueService } = getBusinessContainer();
    const entry = await cashierQueueService.transfer(
      auth.tenantId,
      entryId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ entry }, requestId);
  },
);
