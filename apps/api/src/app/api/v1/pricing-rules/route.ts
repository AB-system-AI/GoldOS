import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.finance.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { pricingRuleService } = getBusinessContainer();

  const type = searchParams.get('type') ?? undefined;
  const isActive = searchParams.get('isActive');

  const pricingRules = await pricingRuleService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(type
      ? {
          type: type as 'GOLD_RATE' | 'MAKING_CHARGE' | 'DISCOUNT' | 'MARKUP' | 'BUNDLE' | 'CUSTOM',
        }
      : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ pricingRules }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { pricingRuleService } = getBusinessContainer();

  const pricingRule = await pricingRuleService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ pricingRule }, requestId, { status: 201 });
});
