import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.pos.update', async (request, auth) => {
  const requestId = getRequestId(request);
  const body = (await request.json()) as { branchId?: string; cashierEmployeeId?: string };

  if (!body.branchId || !body.cashierEmployeeId) {
    return jsonError('VALIDATION_ERROR', 'branchId and cashierEmployeeId are required', requestId, {
      status: 400,
    });
  }

  const { cashierQueueService } = getBusinessContainer();
  const entry = await cashierQueueService.callNext(
    auth.tenantId,
    body.branchId,
    body.cashierEmployeeId,
    buildAuditContext(request, auth),
  );

  return jsonOk({ entry }, requestId);
});
