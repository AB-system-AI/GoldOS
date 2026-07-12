import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.report.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const { financialReportService } = getBusinessContainer();

  const reportType = searchParams.get('type') ?? 'trial-balance';
  const branchId = searchParams.get('branchId') ?? undefined;
  const periodId = searchParams.get('periodId') ?? undefined;
  const filters = { branchId, periodId };

  switch (reportType) {
    case 'balance-sheet':
      return jsonOk(
        { report: await financialReportService.balanceSheet(auth.tenantId, filters) },
        requestId,
      );
    case 'income-statement':
      return jsonOk(
        { report: await financialReportService.incomeStatement(auth.tenantId, filters) },
        requestId,
      );
    case 'general-ledger': {
      const accountId = searchParams.get('accountId');
      if (!accountId) {
        return jsonOk({ error: 'accountId required' }, requestId, { status: 400 });
      }
      return jsonOk(
        { report: await financialReportService.generalLedger(auth.tenantId, accountId) },
        requestId,
      );
    }
    case 'account-statement': {
      const accountId = searchParams.get('accountId');
      if (!accountId) {
        return jsonOk({ error: 'accountId required' }, requestId, { status: 400 });
      }
      return jsonOk(
        { report: await financialReportService.accountStatement(auth.tenantId, accountId) },
        requestId,
      );
    }
    case 'cash-flow':
      return jsonOk(
        { report: await financialReportService.cashFlowStatement(auth.tenantId, filters) },
        requestId,
      );
    default:
      return jsonOk(
        { report: await financialReportService.trialBalance(auth.tenantId, filters) },
        requestId,
      );
  }
});
