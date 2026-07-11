import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.finance.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const { branchService } = getBusinessContainer();
    const currencies = await branchService.listCurrencies(auth.tenantId, branchId);

    return jsonOk({ currencies }, requestId);
  },
);

export const POST = withBusinessPermission(
  'tenant.finance.create',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { branchService } = getBusinessContainer();

    const currency = await branchService.addCurrency(
      auth.tenantId,
      branchId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ currency }, requestId, { status: 201 });
  },
);
