import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.report.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { ledgerQueryService } = getBusinessContainer();

  const type = searchParams.get('type') ?? 'general-ledger';
  const fromDateParam = searchParams.get('fromDate');
  const toDateParam = searchParams.get('toDate');

  if (
    !['general-ledger', 'account-statement', 'customer-ledger', 'supplier-ledger'].includes(type)
  ) {
    return jsonError('VALIDATION_ERROR', 'Invalid ledger type', requestId, { status: 400 });
  }

  try {
    const result = await ledgerQueryService.query(auth.tenantId, {
      type: type as 'general-ledger' | 'account-statement' | 'customer-ledger' | 'supplier-ledger',
      accountId: searchParams.get('accountId') ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
      supplierId: searchParams.get('supplierId') ?? undefined,
      branchId: searchParams.get('branchId') ?? undefined,
      fromDate: fromDateParam ? new Date(fromDateParam) : undefined,
      toDate: toDateParam ? new Date(toDateParam) : undefined,
      skip: filters.skip,
      take: filters.take,
    });

    return jsonOk(result, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ledger query failed';
    return jsonError('VALIDATION_ERROR', message, requestId, { status: 400 });
  }
});
