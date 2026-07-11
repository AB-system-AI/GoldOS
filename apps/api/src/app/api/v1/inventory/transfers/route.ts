import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.inventory.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const { transferService } = getBusinessContainer();

  const fromBranchId = searchParams.get('fromBranchId') ?? undefined;
  const toBranchId = searchParams.get('toBranchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const transfers = await transferService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(fromBranchId ? { fromBranchId } : {}),
    ...(toBranchId ? { toBranchId } : {}),
    ...(status
      ? {
          status: status as
            | 'DRAFT'
            | 'PENDING'
            | 'PENDING_APPROVAL'
            | 'APPROVED'
            | 'REJECTED'
            | 'IN_TRANSIT'
            | 'RECEIVED'
            | 'CANCELLED',
        }
      : {}),
  });

  return jsonOk({ transfers }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { transferService } = getBusinessContainer();

  const transfer = await transferService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ transfer }, requestId, { status: 201 });
});
