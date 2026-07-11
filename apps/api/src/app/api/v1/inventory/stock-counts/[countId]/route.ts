import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.inventory.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { countId } = await routeContext.params;

    if (!countId) {
      return jsonError('VALIDATION_ERROR', 'Stock count ID required', requestId, { status: 400 });
    }

    const { stockCountService } = getBusinessContainer();
    const stockCount = await stockCountService.getById(auth.tenantId, countId);

    return jsonOk({ stockCount }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.inventory.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { countId } = await routeContext.params;

    if (!countId) {
      return jsonError('VALIDATION_ERROR', 'Stock count ID required', requestId, { status: 400 });
    }

    const body = (await request.json()) as { action?: string; line?: unknown };
    const { stockCountService } = getBusinessContainer();
    const context = buildAuditContext(request, auth);

    switch (body.action) {
      case 'start': {
        const stockCount = await stockCountService.start(auth.tenantId, countId, context);
        return jsonOk({ stockCount }, requestId);
      }
      case 'recordLine': {
        const line = await stockCountService.recordLine(auth.tenantId, countId, body.line, context);
        return jsonOk({ line }, requestId);
      }
      case 'complete': {
        const stockCount = await stockCountService.complete(auth.tenantId, countId, context);
        return jsonOk({ stockCount }, requestId);
      }
      default:
        return jsonError(
          'VALIDATION_ERROR',
          'action must be one of: start, recordLine, complete',
          requestId,
          { status: 400 },
        );
    }
  },
);

export const DELETE = withBusinessPermission(
  'tenant.inventory.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { countId } = await routeContext.params;

    if (!countId) {
      return jsonError('VALIDATION_ERROR', 'Stock count ID required', requestId, { status: 400 });
    }

    const { stockCountService } = getBusinessContainer();
    const result = await stockCountService.delete(
      auth.tenantId,
      countId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
