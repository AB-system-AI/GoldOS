import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.pricing.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency') ?? 'SAR';
  const { goldPriceService } = getBusinessContainer();

  const prices = await goldPriceService.getCachedPrices(auth.tenantId, currency);

  return jsonOk({ prices }, requestId);
});

export const POST = withBusinessPermission('tenant.pricing.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json().catch(() => ({}));
  const { goldPriceService } = getBusinessContainer();

  const result = await goldPriceService.syncPrices(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ sync: result }, requestId);
});
