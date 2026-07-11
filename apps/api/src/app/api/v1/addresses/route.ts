import { buildAuditContext } from '@/lib/business/context';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.settings.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const addressableType = searchParams.get('addressableType');
  const addressableId = searchParams.get('addressableId');

  if (!addressableType || !addressableId) {
    return jsonError(
      'VALIDATION_ERROR',
      'addressableType and addressableId query parameters are required',
      requestId,
      { status: 400 },
    );
  }

  const { addressService } = getBusinessContainer();
  const addresses = await addressService.listForEntity(
    auth.tenantId,
    addressableType,
    addressableId,
  );

  return jsonOk({ addresses }, requestId);
});

export const POST = withBusinessPermission('tenant.settings.manage', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { addressService } = getBusinessContainer();

  const address = await addressService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ address }, requestId, { status: 201 });
});
