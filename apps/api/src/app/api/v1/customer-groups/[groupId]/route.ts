import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.crm.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { groupId } = await routeContext.params;

    if (!groupId) {
      return jsonError('VALIDATION_ERROR', 'Group ID required', requestId, { status: 400 });
    }

    const { customerGroupService } = getBusinessContainer();
    const group = await customerGroupService.getById(auth.tenantId, groupId);

    return jsonOk({ group }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.crm.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { groupId } = await routeContext.params;

    if (!groupId) {
      return jsonError('VALIDATION_ERROR', 'Group ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { customerGroupService } = getBusinessContainer();

    const group = await customerGroupService.update(
      auth.tenantId,
      groupId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ group }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.crm.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { groupId } = await routeContext.params;

    if (!groupId) {
      return jsonError('VALIDATION_ERROR', 'Group ID required', requestId, { status: 400 });
    }

    const { customerGroupService } = getBusinessContainer();
    const result = await customerGroupService.delete(
      auth.tenantId,
      groupId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
