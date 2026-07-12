import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.pos.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { posService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const employeeId = searchParams.get('employeeId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const sessions = await posService.listSessions(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status: status as never } : {}),
  });

  return jsonOk({ sessions }, requestId);
});

export const POST = withBusinessPermission('tenant.pos.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { posService } = getBusinessContainer();

  const session = await posService.openSession(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ session }, requestId, { status: 201 });
});
