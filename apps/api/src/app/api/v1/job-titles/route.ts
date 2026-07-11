import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.hr.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { jobTitleService } = getBusinessContainer();

  const isActive = searchParams.get('isActive');

  const jobTitles = await jobTitleService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
  });

  return jsonOk({ jobTitles }, requestId);
});

export const POST = withBusinessPermission('tenant.hr.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { jobTitleService } = getBusinessContainer();

  const jobTitle = await jobTitleService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ jobTitle }, requestId, { status: 201 });
});
