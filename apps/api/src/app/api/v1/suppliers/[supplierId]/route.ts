import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.suppliers.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;

    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }

    const { supplierService } = getBusinessContainer();
    const supplier = await supplierService.getById(auth.tenantId, supplierId);

    return jsonOk({ supplier }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.suppliers.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;

    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { supplierService } = getBusinessContainer();

    const supplier = await supplierService.update(
      auth.tenantId,
      supplierId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ supplier }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.suppliers.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;

    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }

    const { supplierService } = getBusinessContainer();
    const result = await supplierService.delete(
      auth.tenantId,
      supplierId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
