import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.suppliers.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;

    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }

    const { supplierService } = getBusinessContainer();
    const bankAccounts = await supplierService.listBankAccounts(auth.tenantId, supplierId);

    return jsonOk({ bankAccounts }, requestId);
  },
);

export const POST = withBusinessPermission(
  'tenant.suppliers.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { supplierId } = await routeContext.params;

    if (!supplierId) {
      return jsonError('VALIDATION_ERROR', 'Supplier ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { supplierService } = getBusinessContainer();
    const bankAccount = await supplierService.addBankAccount(
      auth.tenantId,
      supplierId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ bankAccount }, requestId, { status: 201 });
  },
);
