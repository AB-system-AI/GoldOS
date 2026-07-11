import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { brandId } = await routeContext.params;

    if (!brandId) {
      return jsonError('VALIDATION_ERROR', 'Brand ID required', requestId, { status: 400 });
    }

    const { brandService } = getBusinessContainer();
    const brand = await brandService.getById(auth.tenantId, brandId);

    return jsonOk({ brand }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { brandId } = await routeContext.params;

    if (!brandId) {
      return jsonError('VALIDATION_ERROR', 'Brand ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { brandService } = getBusinessContainer();

    const brand = await brandService.update(
      auth.tenantId,
      brandId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ brand }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { brandId } = await routeContext.params;

    if (!brandId) {
      return jsonError('VALIDATION_ERROR', 'Brand ID required', requestId, { status: 400 });
    }

    const { brandService } = getBusinessContainer();
    const result = await brandService.delete(
      auth.tenantId,
      brandId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
