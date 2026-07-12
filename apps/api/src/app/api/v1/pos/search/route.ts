import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.pos.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const { posService } = getBusinessContainer();

  const filters = Object.fromEntries(searchParams.entries());
  const results = await posService.searchProducts(auth.tenantId, filters);

  return jsonOk(results, requestId);
});
