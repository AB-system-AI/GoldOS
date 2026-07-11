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
  const { productService } = getBusinessContainer();

  const categoryId = searchParams.get('categoryId') ?? undefined;
  const brandId = searchParams.get('brandId') ?? undefined;
  const collectionId = searchParams.get('collectionId') ?? undefined;
  const type = searchParams.get('type') ?? undefined;

  const products = await productService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(brandId ? { brandId } : {}),
    ...(collectionId ? { collectionId } : {}),
    ...(type
      ? {
          type: type as
            'GOLD' | 'DIAMOND' | 'GEMSTONE' | 'WATCH' | 'SILVER' | 'ACCESSORY' | 'OTHER',
        }
      : {}),
    ...(filters.status ? { status: filters.status as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' } : {}),
  });

  return jsonOk({ products }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { productService } = getBusinessContainer();

  const product = await productService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ product }, requestId, { status: 201 });
});
