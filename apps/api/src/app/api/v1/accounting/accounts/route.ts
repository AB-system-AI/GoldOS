import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.accounting.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { chartOfAccountService } = getBusinessContainer();

  const accountType = searchParams.get('accountType') ?? undefined;
  const branchId = searchParams.get('branchId') ?? undefined;
  const isActive = searchParams.get('isActive');

  const accounts = await chartOfAccountService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(accountType ? { accountType: accountType as never } : {}),
    ...(branchId ? { branchId } : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    search: searchParams.get('search') ?? undefined,
  });

  return jsonOk({ accounts }, requestId);
});

export const POST = withBusinessPermission('tenant.accounting.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { chartOfAccountService } = getBusinessContainer();

  const account = await chartOfAccountService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ account }, requestId, { status: 201 });
});
