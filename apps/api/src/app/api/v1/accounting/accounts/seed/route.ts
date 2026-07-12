import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission('tenant.accounting.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const { tenantFinanceBootstrapService } = getBusinessContainer();

  const result = await tenantFinanceBootstrapService.seedTenantFinance(
    auth.tenantId,
    buildAuditContext(request, auth),
  );

  return jsonOk(
    { accounts: result.accounts, categories: result.categories, count: result.accounts.length },
    requestId,
    { status: 201 },
  );
});
