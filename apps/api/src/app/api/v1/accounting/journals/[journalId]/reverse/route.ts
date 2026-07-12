import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.accounting.post',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { journalId } = await routeContext.params;

    if (!journalId) {
      return jsonError('VALIDATION_ERROR', 'Journal ID required', requestId, { status: 400 });
    }

    const { journalService } = getBusinessContainer();

    const journal = await journalService.reverse(
      auth.tenantId,
      journalId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ journal }, requestId);
  },
);
