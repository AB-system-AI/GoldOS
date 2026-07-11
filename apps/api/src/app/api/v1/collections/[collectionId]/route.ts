import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { collectionId } = await routeContext.params;

    if (!collectionId) {
      return jsonError('VALIDATION_ERROR', 'Collection ID required', requestId, { status: 400 });
    }

    const { collectionService } = getBusinessContainer();
    const collection = await collectionService.getById(auth.tenantId, collectionId);

    return jsonOk({ collection }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { collectionId } = await routeContext.params;

    if (!collectionId) {
      return jsonError('VALIDATION_ERROR', 'Collection ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { collectionService } = getBusinessContainer();

    const collection = await collectionService.update(
      auth.tenantId,
      collectionId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ collection }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { collectionId } = await routeContext.params;

    if (!collectionId) {
      return jsonError('VALIDATION_ERROR', 'Collection ID required', requestId, { status: 400 });
    }

    const { collectionService } = getBusinessContainer();
    const result = await collectionService.delete(
      auth.tenantId,
      collectionId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
