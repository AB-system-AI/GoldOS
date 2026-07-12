import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

const PRINT_FORMATS = ['A4', 'RECEIPT_80MM', 'RECEIPT_58MM', 'PDF'] as const;
type PrintFormat = (typeof PRINT_FORMATS)[number];

function isPrintFormat(value: string): value is PrintFormat {
  return (PRINT_FORMATS as readonly string[]).includes(value);
}

export const GET = withBusinessPermission(
  'tenant.invoice.print',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { invoiceId } = await routeContext.params;

    if (!invoiceId) {
      return jsonError('VALIDATION_ERROR', 'Invoice ID required', requestId, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get('format') ?? 'A4';

    if (!isPrintFormat(formatParam)) {
      return jsonError(
        'VALIDATION_ERROR',
        'format must be one of A4, RECEIPT_80MM, RECEIPT_58MM, PDF',
        requestId,
        { status: 400 },
      );
    }

    const { invoicePrintService } = getBusinessContainer();
    const print = await invoicePrintService.generatePrintPayload(
      auth.tenantId,
      invoiceId,
      formatParam,
    );

    if (!print) {
      return jsonError('NOT_FOUND', 'Invoice not found', requestId, { status: 404 });
    }

    return jsonOk({ print }, requestId);
  },
);
