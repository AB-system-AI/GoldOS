import { parseListFilters, parsePagination } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.settings.view',
  async (request, _auth, routeContext) => {
    const requestId = getRequestId(request);
    const { countryId } = await routeContext.params;

    if (!countryId) {
      return jsonError('VALIDATION_ERROR', 'Country ID required', requestId, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const filters = parseListFilters(searchParams);
    const pagination = parsePagination(searchParams);
    const { geoService } = getBusinessContainer();

    const isActive = searchParams.get('isActive');

    const cities = await geoService.listCities({
      countryId,
      ...pagination,
      search: filters.search,
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    });

    return jsonOk({ cities }, requestId);
  },
);
