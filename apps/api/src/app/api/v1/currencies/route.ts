import { buildAuditContext } from '@/lib/business/context';
import { parsePagination } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.view', async (request) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const { currencyService } = getBusinessContainer();

  const isActive = searchParams.get('isActive');

  const currencies = await currencyService.list({
    ...pagination,
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ currencies }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { currencyService } = getBusinessContainer();
  const audit = { ...buildAuditContext(request, auth), tenantId: auth.tenantId };

  const currency = await currencyService.create(body, audit);

  return jsonOk({ currency }, requestId, { status: 201 });
});
