import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.suppliers.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { supplierService } = getBusinessContainer();

  const categoryId = searchParams.get('categoryId') ?? undefined;
  const supplierType = searchParams.get('supplierType') ?? undefined;

  const suppliers = await supplierService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    search: filters.search,
    ...(categoryId ? { categoryId } : {}),
    ...(supplierType
      ? { supplierType: supplierType as 'LOCAL' | 'INTERNATIONAL' | 'MANUFACTURER' | 'WORKSHOP' }
      : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED' } : {}),
  });

  return jsonOk({ suppliers }, requestId);
});

export const POST = withBusinessPermission('tenant.suppliers.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { supplierService } = getBusinessContainer();

  const supplier = await supplierService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ supplier }, requestId, { status: 201 });
});
