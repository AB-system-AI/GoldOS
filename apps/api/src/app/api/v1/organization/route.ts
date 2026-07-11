import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.organization.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { organizationService } = getBusinessContainer();

  const organizations = await organizationService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' } : {}),
  });

  return jsonOk({ organizations }, requestId);
});

export const POST = withBusinessPermission('tenant.organization.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { organizationService } = getBusinessContainer();

  const organization = await organizationService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ organization }, requestId, { status: 201 });
});
