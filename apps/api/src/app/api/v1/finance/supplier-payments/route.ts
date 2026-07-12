import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.finance.bank.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { purchaseOrderService } = getBusinessContainer();

  const payment = await purchaseOrderService.recordSupplierPayment(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ payment }, requestId, { status: 201 });
});
