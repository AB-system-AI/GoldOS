import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.finance.expense.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { expenseId } = await routeContext.params;

    if (!expenseId) {
      return jsonError('VALIDATION_ERROR', 'Expense ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { expenseAccountingService } = getBusinessContainer();

    const expense = await expenseAccountingService.approveAndPost(
      auth.tenantId,
      expenseId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ expense }, requestId);
  },
);
