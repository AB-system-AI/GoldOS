import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.branches.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const { branchService } = getBusinessContainer();
    const branch = await branchService.getById(auth.tenantId, branchId);

    return jsonOk({ branch }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.branches.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { branchService } = getBusinessContainer();

    const branch = await branchService.update(
      auth.tenantId,
      branchId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ branch }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.branches.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { branchId } = await routeContext.params;

    if (!branchId) {
      return jsonError('VALIDATION_ERROR', 'Branch ID required', requestId, { status: 400 });
    }

    const { branchService } = getBusinessContainer();
    const result = await branchService.delete(
      auth.tenantId,
      branchId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
