import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.accounting.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { fiscalPeriodService } = getBusinessContainer();

  const fiscalYears = await fiscalPeriodService.listFiscalYears(auth.tenantId);
  return jsonOk({ fiscalYears }, requestId);
});

export const POST = withBusinessPermission('tenant.accounting.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { fiscalPeriodService } = getBusinessContainer();

  const fiscalYear = await fiscalPeriodService.createFiscalYear(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ fiscalYear }, requestId, { status: 201 });
});
