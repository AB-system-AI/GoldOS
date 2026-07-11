import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const { departmentId } = await routeContext.params;

  if (!departmentId) {
    return jsonError('VALIDATION_ERROR', 'Department ID required', requestId, { status: 400 });
  }

  const { departmentService } = getBusinessContainer();
  const department = await departmentService.getById(auth.tenantId, departmentId);

  return jsonOk({ department }, requestId);
});

export const PATCH = withBusinessPermission(
  'tenant.hr.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { departmentId } = await routeContext.params;

    if (!departmentId) {
      return jsonError('VALIDATION_ERROR', 'Department ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { departmentService } = getBusinessContainer();

    const department = await departmentService.update(
      auth.tenantId,
      departmentId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ department }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.hr.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { departmentId } = await routeContext.params;

    if (!departmentId) {
      return jsonError('VALIDATION_ERROR', 'Department ID required', requestId, { status: 400 });
    }

    const { departmentService } = getBusinessContainer();
    const result = await departmentService.delete(
      auth.tenantId,
      departmentId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
