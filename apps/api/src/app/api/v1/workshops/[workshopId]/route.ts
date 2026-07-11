import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const { workshopId } = await routeContext.params;

  if (!workshopId) {
    return jsonError('VALIDATION_ERROR', 'Workshop ID required', requestId, { status: 400 });
  }

  const { workshopService } = getBusinessContainer();
  const workshop = await workshopService.getById(auth.tenantId, workshopId);

  return jsonOk({ workshop }, requestId);
});

export const PATCH = withBusinessPermission(
  'tenant.hr.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { workshopId } = await routeContext.params;

    if (!workshopId) {
      return jsonError('VALIDATION_ERROR', 'Workshop ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { workshopService } = getBusinessContainer();

    const workshop = await workshopService.update(
      auth.tenantId,
      workshopId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ workshop }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.hr.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { workshopId } = await routeContext.params;

    if (!workshopId) {
      return jsonError('VALIDATION_ERROR', 'Workshop ID required', requestId, { status: 400 });
    }

    const { workshopService } = getBusinessContainer();
    const result = await workshopService.delete(
      auth.tenantId,
      workshopId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
