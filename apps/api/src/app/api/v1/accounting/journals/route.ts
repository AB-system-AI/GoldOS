import type { JournalEntryStatus } from '@goldos/database';

import { buildAuditContext } from '@/lib/business/context';
import { parseListFilters } from '@/lib/business/filters';
import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.accounting.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const filters = parseListFilters(searchParams);
  const statusParam = searchParams.get('status');
  const { journalService } = getBusinessContainer();

  const journals = await journalService.list(auth.tenantId, {
    skip: filters.skip,
    take: filters.take,
    branchId: searchParams.get('branchId') ?? undefined,
    status: statusParam ? (statusParam as JournalEntryStatus) : undefined,
  });

  return jsonOk({ journals }, requestId);
});

export const POST = withBusinessPermission('tenant.accounting.create', async (request, auth) => {
  const requestId = getRequestId(request);
  const body: unknown = await request.json();
  const { journalService } = getBusinessContainer();

  const journal = await journalService.createDraft(
    auth.tenantId,
    body,
    buildAuditContext(request, auth),
  );

  return jsonOk({ journal }, requestId, { status: 201 });
});
