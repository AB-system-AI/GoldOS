import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const { employeeId } = await routeContext.params;

  if (!employeeId) {
    return jsonError('VALIDATION_ERROR', 'Employee ID required', requestId, { status: 400 });
  }

  const { employeeService } = getBusinessContainer();
  const employee = await employeeService.getById(auth.tenantId, employeeId);

  return jsonOk({ employee }, requestId);
});

export const PATCH = withBusinessPermission(
  'tenant.hr.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { employeeId } = await routeContext.params;

    if (!employeeId) {
      return jsonError('VALIDATION_ERROR', 'Employee ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { employeeService } = getBusinessContainer();

    const employee = await employeeService.update(
      auth.tenantId,
      employeeId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ employee }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.hr.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { employeeId } = await routeContext.params;

    if (!employeeId) {
      return jsonError('VALIDATION_ERROR', 'Employee ID required', requestId, { status: 400 });
    }

    const { employeeService } = getBusinessContainer();
    const result = await employeeService.delete(
      auth.tenantId,
      employeeId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
