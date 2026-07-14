import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.purchasing.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body = (await request.json()) as {
    purchaseRequestId: string;
    title: string;
    supplierIds?: string[];
    createdById?: string;
  };
  const { procurementService } = getBusinessContainer();
  const rfq = await procurementService.convertRequestToRfq(
    auth.tenantId,
    body.purchaseRequestId,
    {
      title: body.title,
      supplierIds: body.supplierIds,
      createdById: body.createdById,
    },
    buildAuditContext(request, auth),
  );
  return jsonOk({ rfq }, requestId, { status: 201 });
});
