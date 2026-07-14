import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';
import type { PurchaseDocumentType } from '@goldos/database';

export const GET = withBusinessPermission('tenant.purchasing.approve', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const documentType = searchParams.get('documentType') as PurchaseDocumentType | null;
  const skip = Number(searchParams.get('skip') ?? 0);
  const take = Number(searchParams.get('take') ?? 50);

  const { purchaseApprovalService } = getBusinessContainer();
  const approvals = await purchaseApprovalService.listPending(auth.tenantId, {
    ...(documentType ? { documentType } : {}),
    skip,
    take,
  });

  return jsonOk({ approvals }, requestId);
});
