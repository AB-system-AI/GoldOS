import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.report.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const { jewelryReportService } = getBusinessContainer();

  const reportType = searchParams.get('type') ?? 'gold-inventory';
  const branchId = searchParams.get('branchId') ?? undefined;
  const fromDateParam = searchParams.get('fromDate');
  const toDateParam = searchParams.get('toDate');
  const fromDate = fromDateParam ? new Date(fromDateParam) : undefined;
  const toDate = toDateParam ? new Date(toDateParam) : undefined;
  const dateFilters = { branchId, fromDate, toDate };

  switch (reportType) {
    case 'gold-profit':
      return jsonOk(
        { report: await jewelryReportService.goldProfit(auth.tenantId, dateFilters) },
        requestId,
      );
    case 'branch-profitability':
      return jsonOk(
        { report: await jewelryReportService.branchProfitability(auth.tenantId) },
        requestId,
      );
    case 'making-profit':
      return jsonOk(
        { report: await jewelryReportService.makingProfit(auth.tenantId, dateFilters) },
        requestId,
      );
    case 'employee-sales':
      return jsonOk(
        { report: await jewelryReportService.employeeSalesPerformance(auth.tenantId, dateFilters) },
        requestId,
      );
    case 'gold-cost-analysis':
      return jsonOk(
        { report: await jewelryReportService.goldCostAnalysis(auth.tenantId, dateFilters) },
        requestId,
      );
    default:
      return jsonOk(
        { report: await jewelryReportService.goldInventoryValue(auth.tenantId, { branchId }) },
        requestId,
      );
  }
});
