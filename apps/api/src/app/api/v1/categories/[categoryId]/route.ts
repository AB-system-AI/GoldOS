import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { categoryId } = await routeContext.params;

    if (!categoryId) {
      return jsonError('VALIDATION_ERROR', 'Category ID required', requestId, { status: 400 });
    }

    const { categoryService } = getBusinessContainer();
    const category = await categoryService.getById(auth.tenantId, categoryId);

    return jsonOk({ category }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { categoryId } = await routeContext.params;

    if (!categoryId) {
      return jsonError('VALIDATION_ERROR', 'Category ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { categoryService } = getBusinessContainer();

    const category = await categoryService.update(
      auth.tenantId,
      categoryId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ category }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { categoryId } = await routeContext.params;

    if (!categoryId) {
      return jsonError('VALIDATION_ERROR', 'Category ID required', requestId, { status: 400 });
    }

    const { categoryService } = getBusinessContainer();
    const result = await categoryService.delete(
      auth.tenantId,
      categoryId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
