import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.settings.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const { branchService } = getBusinessContainer();
    const settings = await branchService.listSettings(auth.tenantId, branchId);

    return jsonOk({ settings }, requestId);
  },
);

export const PUT = withBusinessPermission(
  'tenant.settings.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { branchService } = getBusinessContainer();

    const setting = await branchService.upsertSetting(
      auth.tenantId,
      branchId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ setting }, requestId);
  },
);
