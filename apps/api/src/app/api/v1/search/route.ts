import { minimumSearchPermissions } from '@goldos/business';

import { withBusinessAnyPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessAnyPermission(minimumSearchPermissions(), async (request, auth) => {
  const requestId = getRequestId(request);
  const params = new URL(request.url).searchParams;
  const q = params.get('q');

  if (!q) {
    return jsonError('VALIDATION_ERROR', 'Query parameter q is required', requestId, {
      status: 400,
    });
  }

  const types = params.getAll('types');
  const branchId = params.get('branchId');
  const limit = params.get('limit');
  const offset = params.get('offset');

  const { globalSearchService } = getBusinessContainer();
  const response = await globalSearchService.search(
    {
      tenantId: auth.tenantId,
      permissions: auth.permissions,
    },
    {
      q,
      ...(types.length > 0 ? { types } : {}),
      ...(branchId ? { branchId } : {}),
      ...(limit ? { limit } : {}),
      ...(offset ? { offset } : {}),
    },
  );

  return jsonOk(response, requestId);
});
