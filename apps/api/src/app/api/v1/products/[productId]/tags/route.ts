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
    const tags = await productService.listTags(auth.tenantId, productId);

    return jsonOk({ tags }, requestId);
  },
);

export const POST = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { productId } = await routeContext.params;

    if (!productId) {
      return jsonError('VALIDATION_ERROR', 'Product ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { productService } = getBusinessContainer();

    const tags = await productService.setTags(
      auth.tenantId,
      productId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ tags }, requestId);
  },
);
