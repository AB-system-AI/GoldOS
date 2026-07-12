import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

function param(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  return value && value.length > 0 ? value : undefined;
}

export const GET = withBusinessPermission('tenant.invoice.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { invoiceSearchService } = getBusinessContainer();

  const dateFromParam = param(searchParams, 'dateFrom');
  const dateToParam = param(searchParams, 'dateTo');

  const result = await invoiceSearchService.search(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(param(searchParams, 'invoiceNo') ? { invoiceNo: param(searchParams, 'invoiceNo') } : {}),
    ...(param(searchParams, 'qrCode') ? { qrCode: param(searchParams, 'qrCode') } : {}),
    ...(param(searchParams, 'barcode') ? { barcode: param(searchParams, 'barcode') } : {}),
    ...(param(searchParams, 'customerId') ? { customerId: param(searchParams, 'customerId') } : {}),
    ...(param(searchParams, 'customerPhone')
      ? { customerPhone: param(searchParams, 'customerPhone') }
      : {}),
    ...(param(searchParams, 'nationalId') ? { nationalId: param(searchParams, 'nationalId') } : {}),
    ...(param(searchParams, 'passportNumber')
      ? { passportNumber: param(searchParams, 'passportNumber') }
      : {}),
    ...(param(searchParams, 'taxNumber') ? { taxNumber: param(searchParams, 'taxNumber') } : {}),
    ...(param(searchParams, 'commercialRegistration')
      ? { commercialRegistration: param(searchParams, 'commercialRegistration') }
      : {}),
    ...(param(searchParams, 'salesOrderId')
      ? { salesOrderId: param(searchParams, 'salesOrderId') }
      : {}),
    ...(param(searchParams, 'paymentId') ? { paymentId: param(searchParams, 'paymentId') } : {}),
    ...(param(searchParams, 'employeeId') ? { employeeId: param(searchParams, 'employeeId') } : {}),
    ...(param(searchParams, 'cashierEmployeeId')
      ? { cashierEmployeeId: param(searchParams, 'cashierEmployeeId') }
      : {}),
    ...(param(searchParams, 'branchId') ? { branchId: param(searchParams, 'branchId') } : {}),
    ...(param(searchParams, 'assetId') ? { assetId: param(searchParams, 'assetId') } : {}),
    ...(dateFromParam ? { dateFrom: new Date(dateFromParam) } : {}),
    ...(dateToParam ? { dateTo: new Date(dateToParam) } : {}),
  });

  return jsonOk(result, requestId);
});
