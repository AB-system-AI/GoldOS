import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.payment.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { paymentService } = getBusinessContainer();

  const result = await paymentService.createBatch(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk(result, requestId, { status: 201 });
});
