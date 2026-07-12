import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.accounting.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { journalId } = await routeContext.params;

    if (!journalId) {
      return jsonError('VALIDATION_ERROR', 'Journal ID required', requestId, { status: 400 });
    }

    const { journalService } = getBusinessContainer();

    const journal = await journalService.getById(auth.tenantId, journalId);
    return jsonOk({ journal }, requestId);
  },
);
