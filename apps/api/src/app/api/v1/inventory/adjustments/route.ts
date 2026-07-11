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
  const { inventoryAdjustmentService } = getBusinessContainer();

  const branchId = searchParams.get('branchId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const reasonCode = searchParams.get('reasonCode') ?? undefined;

  const adjustments = await inventoryAdjustmentService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    ...(filters.search ? { search: filters.search } : {}),
    ...(branchId ? { branchId } : {}),
    ...(status
      ? {
          status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
        }
      : {}),
    ...(reasonCode
      ? {
          reasonCode: reasonCode as
            'DAMAGE' | 'LOSS' | 'FOUND' | 'CORRECTION' | 'SHRINKAGE' | 'THEFT' | 'OTHER',
        }
      : {}),
  });

  return jsonOk({ adjustments }, requestId);
});

export const POST = withBusinessPermission('tenant.inventory.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { inventoryAdjustmentService } = getBusinessContainer();

  const adjustment = await inventoryAdjustmentService.create(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ adjustment }, requestId, { status: 201 });
});
