import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.branches.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { branchService } = getBusinessContainer();

  const organizationId = searchParams.get('organizationId') ?? undefined;
  const type = searchParams.get('type') ?? undefined;

  const branches = await branchService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(filters.status ? { branchStatus: filters.status as 'ACTIVE' | 'INACTIVE' | 'CLOSED' } : {}),
    ...(type
      ? {
          type: type as 'SHOWROOM' | 'WORKSHOP' | 'WAREHOUSE' | 'VAULT' | 'OFFICE' | 'HEADQUARTERS',
        }
      : {}),
  });

  return jsonOk({ branches }, requestId);
});

export const POST = withBusinessPermission('tenant.branches.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { branchService } = getBusinessContainer();

  const branch = await branchService.create(auth.tenantId, body, buildAuditContext(request, auth));

  return jsonOk({ branch }, requestId, { status: 201 });
});
