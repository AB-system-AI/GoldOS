import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.purchasing.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { invoiceId } = await routeContext.params;

    if (!invoiceId) {
      return jsonError('VALIDATION_ERROR', 'Invoice ID required', requestId, { status: 400 });
    }

    const { purchaseInvoiceService } = getBusinessContainer();
    const invoice = await purchaseInvoiceService.getById(auth.tenantId, invoiceId);

    return jsonOk({ invoice }, requestId);
  },
);
