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
  const { customerService } = getBusinessContainer();

  const customerGroupId = searchParams.get('customerGroupId') ?? undefined;
  const customerType = searchParams.get('customerType') ?? undefined;

  const customers = await customerService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    search: filters.search,
    ...(customerGroupId ? { customerGroupId } : {}),
    ...(customerType
      ? { customerType: customerType as 'INDIVIDUAL' | 'COMPANY' | 'VIP' | 'WALK_IN' }
      : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED' } : {}),
  });

  return jsonOk({ customers }, requestId);
});

export const POST = withBusinessPermission('tenant.crm.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { customerService } = getBusinessContainer();

  const customer = await customerService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ customer }, requestId, { status: 201 });
});
