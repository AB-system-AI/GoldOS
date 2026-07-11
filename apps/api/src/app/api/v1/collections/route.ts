import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.inventory.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { collectionService } = getBusinessContainer();

  const isActive = searchParams.get('isActive');
  const season = searchParams.get('season') ?? undefined;
  const year = searchParams.get('year');

  const collections = await collectionService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    ...(season ? { season } : {}),
    ...(year !== null && year !== '' ? { year: Number(year) } : {}),
  });

  return jsonOk({ collections }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { collectionService } = getBusinessContainer();

  const collection = await collectionService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ collection }, requestId, { status: 201 });
});
