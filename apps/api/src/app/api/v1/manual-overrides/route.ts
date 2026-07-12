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
  const { manualOverrideService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const referenceType = searchParams.get('referenceType') ?? undefined;
  const referenceId = searchParams.get('referenceId') ?? undefined;
  const overrideType = searchParams.get('overrideType') ?? undefined;

  const overrides = await manualOverrideService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(referenceType ? { referenceType } : {}),
    ...(referenceId ? { referenceId } : {}),
    ...(overrideType ? { overrideType: overrideType as never } : {}),
  });

  return jsonOk({ overrides }, requestId);
});

export const POST = withBusinessPermission('tenant.sales.discount', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { manualOverrideService } = getBusinessContainer();

  const override = await manualOverrideService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ override }, requestId, { status: 201 });
});
