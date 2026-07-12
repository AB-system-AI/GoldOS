import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.approve',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { approvalId } = await routeContext.params;

    if (!approvalId) {
      return jsonError('VALIDATION_ERROR', 'Approval ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { discountApprovalService } = getBusinessContainer();
    const approval = await discountApprovalService.approve(
      auth.tenantId,
      approvalId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ approval }, requestId);
  },
);
