import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission(
  'tenant.invoice.view',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { templateId } = await routeContext.params;

    if (!templateId) {
      return jsonError('VALIDATION_ERROR', 'Template ID required', requestId, { status: 400 });
    }

    const { invoiceTemplateService } = getBusinessContainer();
    const template = await invoiceTemplateService.getById(auth.tenantId, templateId);

    return jsonOk({ template }, requestId);
  },
);

export const PATCH = withBusinessPermission(
  'tenant.invoice.update',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { templateId } = await routeContext.params;

    if (!templateId) {
      return jsonError('VALIDATION_ERROR', 'Template ID required', requestId, { status: 400 });
    }

    const body: unknown = await request.json();
    const { invoiceTemplateService } = getBusinessContainer();
    const template = await invoiceTemplateService.update(
      auth.tenantId,
      templateId,
      body,
      buildAuditContext(request, auth),
    );

    return jsonOk({ template }, requestId);
  },
);

export const DELETE = withBusinessPermission(
  'tenant.invoice.delete',
  async (request, auth, routeContext) => {
    const requestId = getRequestId(request);
    const { templateId } = await routeContext.params;

    if (!templateId) {
      return jsonError('VALIDATION_ERROR', 'Template ID required', requestId, { status: 400 });
    }

    const { invoiceTemplateService } = getBusinessContainer();
    const result = await invoiceTemplateService.remove(
      auth.tenantId,
      templateId,
      buildAuditContext(request, auth),
    );

    return jsonOk(result, requestId);
  },
);
