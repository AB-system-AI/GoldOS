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
  const { departmentService } = getBusinessContainer();

  const parentId = searchParams.get('parentId');
  const isActive = searchParams.get('isActive');

  const departments = await departmentService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(parentId !== null ? { parentId: parentId || null } : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ departments }, requestId);
});

export const POST = withBusinessPermission('tenant.hr.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { departmentService } = getBusinessContainer();

  const department = await departmentService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ department }, requestId, { status: 201 });
});
