import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.sales.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { loyaltyService } = getBusinessContainer();
  const rule = await loyaltyService.getProgramRule(auth.tenantId);

  return jsonOk({ rule }, requestId);
});

export const PUT = withBusinessPermission('tenant.sales.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { loyaltyService } = getBusinessContainer();

  const rule = await loyaltyService.upsertProgramRule(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ rule }, requestId);
});
