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
  const documents = await employeeService.listAttachments(auth.tenantId, employeeId);

  return jsonOk({ documents }, requestId);
});

export const POST = withBusinessPermission(
  'tenant.hr.create',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { employeeId } = await routeContext.params;

    if (!employeeId) {
      return jsonError('VALIDATION_ERROR', 'Employee ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { employeeService } = getBusinessContainer();

    const document = await employeeService.addAttachment(
      auth.tenantId,
      employeeId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ document }, requestId, { status: 201 });
  },
);
