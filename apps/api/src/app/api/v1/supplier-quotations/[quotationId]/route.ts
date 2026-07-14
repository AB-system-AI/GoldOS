import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { quotationId } = await routeContext.params;

    if (!quotationId) {
      return jsonError('VALIDATION_ERROR', 'Quotation ID required', requestId, { status: 400 });
    }

    const { supplierQuotationService } = getBusinessContainer();
    const quotation = await supplierQuotationService.getById(auth.tenantId, quotationId);

    return jsonOk({ quotation }, requestId);
  },
);
