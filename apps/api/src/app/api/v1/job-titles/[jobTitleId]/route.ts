import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth, routeContext) => {
  const requestId = getRequestId(request);
  const { jobTitleId } = await routeContext.params;

  if (!jobTitleId) {
    return jsonError('VALIDATION_ERROR', 'Job title ID required', requestId, { status: 400 });
  }

  const { jobTitleService } = getBusinessContainer();
  const jobTitle = await jobTitleService.getById(auth.tenantId, jobTitleId);

  return jsonOk({ jobTitle }, requestId);
});

export const PATCH = withBusinessPermission(
  'tenant.hr.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { jobTitleId } = await routeContext.params;

    if (!jobTitleId) {
      return jsonError('VALIDATION_ERROR', 'Job title ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { jobTitleService } = getBusinessContainer();

    const jobTitle = await jobTitleService.update(
      auth.tenantId,
      jobTitleId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ jobTitle }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.hr.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { jobTitleId } = await routeContext.params;

    if (!jobTitleId) {
      return jsonError('VALIDATION_ERROR', 'Job title ID required', requestId, { status: 400 });
    }

    const { jobTitleService } = getBusinessContainer();
    const result = await jobTitleService.delete(
      auth.tenantId,
      jobTitleId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
