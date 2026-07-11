import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { productId } = await routeContext.params;

    if (!productId) {
      return jsonError('VALIDATION_ERROR', 'Product ID required', requestId, { status: 400 });
    }

    const { productService } = getBusinessContainer();
    const product = await productService.getById(auth.tenantId, productId);

    return jsonOk({ product }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { productId } = await routeContext.params;

    if (!productId) {
      return jsonError('VALIDATION_ERROR', 'Product ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { productService } = getBusinessContainer();

    const product = await productService.update(
      auth.tenantId,
      productId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ product }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { productId } = await routeContext.params;

    if (!productId) {
      return jsonError('VALIDATION_ERROR', 'Product ID required', requestId, { status: 400 });
    }

    const { productService } = getBusinessContainer();
    const result = await productService.delete(
      auth.tenantId,
      productId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
