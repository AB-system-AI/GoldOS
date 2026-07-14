import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.purchasing.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body = (await request.json()) as { supplierQuotationId: string };
  const { procurementService } = getBusinessContainer();
  const order = await procurementService.convertQuotationToPo(
    auth.tenantId,
    body.supplierQuotationId,
    buildAuditContext(request, auth),
  );
  return jsonOk({ order }, requestId, { status: 201 });
});
