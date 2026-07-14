import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';
import type { PurchaseDocumentType } from '@goldos/database';

export const GET = withBusinessPermission('tenant.purchasing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const documentType = searchParams.get('documentType') as PurchaseDocumentType | null;
  const documentId = searchParams.get('documentId');

  if (!documentType || !documentId) {
    return jsonError(
      'VALIDATION_ERROR',
      'documentType and documentId query parameters are required',
      requestId,
      { status: 400 },
    );
  }

  const { purchaseApprovalService } = getBusinessContainer();
  const approvals = await purchaseApprovalService.listHistory(
    auth.tenantId,
    documentType,
    documentId,
  );

  return jsonOk({ approvals }, requestId);
});
