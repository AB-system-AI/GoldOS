import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.purchasing.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body = (await request.json().catch(() => ({}))) as { branchId?: string };
  const { tenantPurchasingBootstrapService } = getBusinessContainer();
  const result = await tenantPurchasingBootstrapService.seedTenantPurchasing(
    auth.tenantId,
    body.branchId,
    buildAuditContext(request, auth),
  );
  return jsonOk({ configs: result.configs, created: result.created }, requestId, { status: 201 });
});
