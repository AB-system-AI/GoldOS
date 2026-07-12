import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.invoice.cancel',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { invoiceId } = await routeContext.params;

    if (!invoiceId) {
      return jsonError('VALIDATION_ERROR', 'Invoice ID required', requestId, { status: 400 });
    }

    const { invoiceService } = getBusinessContainer();
    const invoice = await invoiceService.voidInvoice(
      auth.tenantId,
      invoiceId,
      buildAuditContext(request, auth),
    );

    return jsonOk({ invoice }, requestId);
  },
);
