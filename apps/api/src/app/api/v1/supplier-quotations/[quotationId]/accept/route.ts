import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.purchasing.manage',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { quotationId } = await routeContext.params;

    if (!quotationId) {
      return jsonError('VALIDATION_ERROR', 'Quotation ID required', requestId, { status: 400 });
    }

    const { supplierQuotationService } = getBusinessContainer();
    const quotation = await supplierQuotationService.accept(
      auth.tenantId,
      quotationId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ quotation }, requestId);
  },
);
