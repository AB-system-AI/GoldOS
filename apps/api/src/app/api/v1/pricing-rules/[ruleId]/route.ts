import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.finance.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { ruleId } = await routeContext.params;

    if (!ruleId) {
      return jsonError('VALIDATION_ERROR', 'Pricing rule ID required', requestId, { status: 400 });
    }

    const { pricingRuleService } = getBusinessContainer();
    const pricingRule = await pricingRuleService.getById(auth.tenantId, ruleId);

    return jsonOk({ pricingRule }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.finance.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { ruleId } = await routeContext.params;

    if (!ruleId) {
      return jsonError('VALIDATION_ERROR', 'Pricing rule ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { pricingRuleService } = getBusinessContainer();

    const pricingRule = await pricingRuleService.update(
      auth.tenantId,
      ruleId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ pricingRule }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.finance.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { ruleId } = await routeContext.params;

    if (!ruleId) {
      return jsonError('VALIDATION_ERROR', 'Pricing rule ID required', requestId, { status: 400 });
    }

    const { pricingRuleService } = getBusinessContainer();
    const result = await pricingRuleService.delete(
      auth.tenantId,
      ruleId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
