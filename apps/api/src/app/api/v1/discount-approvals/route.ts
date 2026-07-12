import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.sales.discount', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { discountApprovalService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const referenceType = searchParams.get('referenceType') ?? undefined;
  const referenceId = searchParams.get('referenceId') ?? undefined;

  const approvals = await discountApprovalService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(referenceType ? { referenceType } : {}),
    ...(referenceId ? { referenceId } : {}),
  });

  return jsonOk({ approvals }, requestId);
});

export const POST = withBusinessPermission('tenant.sales.discount', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { discountApprovalService } = getBusinessContainer();

  const result = await discountApprovalService.request(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ approval: result }, requestId, { status: 201 });
});
