import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.crm.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { customerGroupService } = getBusinessContainer();

  const isActive = searchParams.get('isActive');

  const groups = await customerGroupService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ groups }, requestId);
});

export const POST = withBusinessPermission('tenant.crm.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { customerGroupService } = getBusinessContainer();

  const group = await customerGroupService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ group }, requestId, { status: 201 });
});
