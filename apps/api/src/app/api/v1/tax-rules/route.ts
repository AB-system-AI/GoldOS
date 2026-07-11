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
  const { taxRuleService } = getBusinessContainer();

  const type = searchParams.get('type') ?? undefined;
  const isActive = searchParams.get('isActive');

  const taxRules = await taxRuleService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(type ? { type: type as 'VAT' | 'SALES_TAX' | 'WITHHOLDING' | 'EXEMPT' | 'CUSTOM' } : {}),
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ taxRules }, requestId);
});

export const POST = withBusinessPermission('tenant.finance.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { taxRuleService } = getBusinessContainer();

  const taxRule = await taxRuleService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ taxRule }, requestId, { status: 201 });
});
