import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.invoice.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { invoiceTemplateService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const templateType = searchParams.get('templateType') ?? undefined;
  const isActiveParam = searchParams.get('isActive');
  const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

  const templates = await invoiceTemplateService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(branchId ? { branchId } : {}),
    ...(templateType ? { templateType: templateType as never } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  });

  return jsonOk({ templates }, requestId);
});

export const POST = withBusinessPermission('tenant.invoice.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { invoiceTemplateService } = getBusinessContainer();

  const template = await invoiceTemplateService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ template }, requestId, { status: 201 });
});
