import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { employeeService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const departmentId = searchParams.get('departmentId') ?? undefined;

  const employees = await employeeService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED' } : {}),
  });

  return jsonOk({ employees }, requestId);
});

export const POST = withBusinessPermission('tenant.hr.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { employeeService } = getBusinessContainer();

  const employee = await employeeService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ employee }, requestId, { status: 201 });
});
