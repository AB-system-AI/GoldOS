import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.bank.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { bankAccountingService } = getBusinessContainer();

  const transactions = await bankAccountingService.listTransactions(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    bankId: searchParams.get('bankId') ?? undefined,
  });

  return jsonOk({ transactions }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.bank.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { bankAccountingService } = getBusinessContainer();

  const transaction = await bankAccountingService.createTransaction(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ transaction }, requestId, { status: 201 });
});
