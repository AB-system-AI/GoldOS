import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.settings.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { addressId } = await routeContext.params;

    if (!addressId) {
      return jsonError('VALIDATION_ERROR', 'Address ID required', requestId, { status: 400 });
    }

    const { addressService } = getBusinessContainer();
    const address = await addressService.getById(auth.tenantId, addressId);

    return jsonOk({ address }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.settings.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { addressId } = await routeContext.params;

    if (!addressId) {
      return jsonError('VALIDATION_ERROR', 'Address ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { addressService } = getBusinessContainer();

    const address = await addressService.update(
      auth.tenantId,
      addressId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ address }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.settings.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { addressId } = await routeContext.params;

    if (!addressId) {
      return jsonError('VALIDATION_ERROR', 'Address ID required', requestId, { status: 400 });
    }

    const { addressService } = getBusinessContainer();
    const result = await addressService.delete(
      auth.tenantId,
      addressId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
