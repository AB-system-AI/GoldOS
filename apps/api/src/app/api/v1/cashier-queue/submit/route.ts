import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.pos.update', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { cashierQueueService } = getBusinessContainer();

  const entry = await cashierQueueService.submitFromSeller(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ entry }, requestId, { status: 201 });
});
