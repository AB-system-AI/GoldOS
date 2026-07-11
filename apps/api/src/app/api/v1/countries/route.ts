import { parsePagination } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.settings.view', async (request) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const { geoService } = getBusinessContainer();

  const isActive = searchParams.get('isActive');

  const countries = await geoService.listCountries({
    ...pagination,
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ countries }, requestId);
});
