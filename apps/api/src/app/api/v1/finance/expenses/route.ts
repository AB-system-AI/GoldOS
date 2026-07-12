import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.finance.expense.manage',
  async (request, auth) => {
    const requestId = getRequestId(request);
    const { searchParams } = new URL(request.url);
    const filters = parseListFilters(searchParams);
    const { expenseAccountingService } = getBusinessContainer();

    const expenses = await expenseAccountingService.listExpenses(auth.tenantId, {
      skip: filters.skip,
      take: filters.take,
      branchId: searchParams.get('branchId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });

    return jsonOk({ expenses }, requestId);
  },
);

export const POST = withBusinessPermission(
  'tenant.finance.expense.manage',
  async (request, auth) => {
    const requestId = getRequestId(request);
    const body: unknown = await request.json();
    const { expenseAccountingService } = getBusinessContainer();

    const expense = await expenseAccountingService.createExpense(
      auth.tenantId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ expense }, requestId, { status: 201 });
  },
);
