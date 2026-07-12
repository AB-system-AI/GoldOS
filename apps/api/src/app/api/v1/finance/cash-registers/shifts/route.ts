import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.cash.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { cashRegisterService } = getBusinessContainer();

  const shifts = await cashRegisterService.listShifts(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    branchId: searchParams.get('branchId') ?? undefined,
  });

  return jsonOk({ shifts }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.cash.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { cashRegisterService } = getBusinessContainer();

  const shift = await cashRegisterService.openShift(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ shift }, requestId, { status: 201 });
});
