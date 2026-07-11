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

  const overrides = await goldPriceService.listOverrides(auth.tenantId, currency);

  return jsonOk({ overrides }, requestId);
});

export const POST = withBusinessPermission('tenant.pricing.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { goldPriceService } = getBusinessContainer();

  const override = await goldPriceService.createOverride(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ override }, requestId, { status: 201 });
});
