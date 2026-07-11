import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.settings.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { settingsService } = getBusinessContainer();

  const settings = await settingsService.list(auth.tenantId, 'TENANT');

  return jsonOk({ settings }, requestId);
});

export const PUT = withBusinessPermission('tenant.settings.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body = (await request.json()) as Record<string, unknown>;
  const { settingsService } = getBusinessContainer();

  const setting = await settingsService.upsert(
    auth.tenantId,
    { ...body, scope: 'TENANT' },
    buildAuditContext(request, auth),
  );

  return jsonOk({ setting }, requestId);
});
