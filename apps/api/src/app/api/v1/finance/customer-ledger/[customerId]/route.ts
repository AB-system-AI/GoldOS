import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.accounting.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { customerId } = await routeContext.params;

    if (!customerId) {
      return jsonError('VALIDATION_ERROR', 'Customer ID required', requestId, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const { customerLedgerService } = getBusinessContainer();

    const statement = await customerLedgerService.getStatement(auth.tenantId, customerId);
    const entries = await customerLedgerService.list(auth.tenantId, customerId, {
      branchId: searchParams.get('branchId') ?? undefined,
    });

    return jsonOk({ statement, entries }, requestId);
  },
);
