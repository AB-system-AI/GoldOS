import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.organization.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { organizationId } = await routeContext.params;

    if (!organizationId) {
      return jsonError('VALIDATION_ERROR', 'Organization ID required', requestId, { status: 400 });
    }

    const { organizationService } = getBusinessContainer();
    const organization = await organizationService.getById(auth.tenantId, organizationId);

    return jsonOk({ organization }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.organization.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { organizationId } = await routeContext.params;

    if (!organizationId) {
      return jsonError('VALIDATION_ERROR', 'Organization ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { organizationService } = getBusinessContainer();

    const organization = await organizationService.update(
      auth.tenantId,
      organizationId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ organization }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.organization.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { organizationId } = await routeContext.params;

    if (!organizationId) {
      return jsonError('VALIDATION_ERROR', 'Organization ID required', requestId, { status: 400 });
    }

    const { organizationService } = getBusinessContainer();
    const result = await organizationService.delete(
      auth.tenantId,
      organizationId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
