import { buildAuditContext } from '@/lib/business/context';
import { parsePagination } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const { exchangeRateService } = getBusinessContainer();

  const currencyId = searchParams.get('currencyId') ?? undefined;
  const baseCurrency = searchParams.get('baseCurrency') ?? undefined;

  const exchangeRates = await exchangeRateService.list(auth.tenantId, {
    ...pagination,
    ...(currencyId ? { currencyId } : {}),
    ...(baseCurrency ? { baseCurrency } : {}),
  });

  return jsonOk({ exchangeRates }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { exchangeRateService } = getBusinessContainer();
  const audit = { ...buildAuditContext(request, auth), tenantId: auth.tenantId };

  const exchangeRate = await exchangeRateService.create(auth.tenantId, body, audit);

  return jsonOk({ exchangeRate }, requestId, { status: 201 });
});
