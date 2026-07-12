import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const POST = withBusinessPermission(
  'tenant.sales.create',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { orderId } = await routeContext.params;

    if (!orderId) {
      return jsonError('VALIDATION_ERROR', 'Order ID required', requestId, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { checkoutOrchestratorService } = getBusinessContainer();
    const result = await checkoutOrchestratorService.execute(
      {
        tenantId: auth.tenantId,
        orderId,
        ...(body as {
          branchId: string;
          customerId: string;
          employeeId?: string | null;
          cashierEmployeeId?: string | null;
          payments?: { method: string; amount: number; reference?: string | null }[];
          loyaltyPointsToRedeem?: number;
          discountPercent?: number;
          discountType?: 'PERCENTAGE' | 'FIXED';
          completeSale?: boolean;
        }),
      },
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
