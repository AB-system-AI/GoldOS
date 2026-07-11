import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.crm.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const { customerService } = getBusinessContainer();
    const customer = await customerService.getById(auth.tenantId, customerId);

    return jsonOk({ customer }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.crm.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { customerService } = getBusinessContainer();

    const customer = await customerService.update(
      auth.tenantId,
      customerId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ customer }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.crm.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const { customerService } = getBusinessContainer();
    const result = await customerService.delete(
      auth.tenantId,
      customerId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
