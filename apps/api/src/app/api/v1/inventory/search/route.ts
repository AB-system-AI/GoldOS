import { withBusinessPermission } from '@/lib/business/handlers';
import { getBusinessContainer } from '@/lib/di';
import { getRequestId } from '@/lib/http/request';
import { jsonError, jsonOk } from '@/lib/http/response';

export const GET = withBusinessPermission('tenant.inventory.view', async (request, auth) => {
  const requestId = getRequestId(request);
  const params = new URL(request.url).searchParams;
  const q = params.get('q');

  if (!q) {
    return jsonError('VALIDATION_ERROR', 'Query parameter q is required', requestId, {
      status: 400,
    });
  }

  const branchId = params.get('branchId') ?? undefined;
  const productId = params.get('productId') ?? undefined;
  const barcode = params.get('barcode') ?? undefined;
  const qrCode = params.get('qrCode') ?? undefined;
  const sku = params.get('sku') ?? undefined;
  const serialNumber = params.get('serialNumber') ?? undefined;
  const assetId = params.get('assetId') ?? undefined;
  const certificateNumber = params.get('certificateNumber') ?? undefined;
  const karat = params.get('karat') ?? undefined;
  const limit = params.get('limit');
  const offset = params.get('offset');

  const { inventorySearchService } = getBusinessContainer();
  const results = await inventorySearchService.search(auth.tenantId, {
    q,
    ...(branchId ? { branchId } : {}),
    ...(productId ? { productId } : {}),
    ...(barcode ? { barcode } : {}),
    ...(qrCode ? { qrCode } : {}),
    ...(sku ? { sku } : {}),
    ...(serialNumber ? { serialNumber } : {}),
    ...(assetId ? { assetId } : {}),
    ...(certificateNumber ? { certificateNumber } : {}),
    ...(karat
      ? {
          karat: karat as 'K8' | 'K9' | 'K14' | 'K18' | 'K21' | 'K22' | 'K24',
        }
      : {}),
    ...(limit ? { limit: Number(limit) } : {}),
    ...(offset ? { offset: Number(offset) } : {}),
  });

  return jsonOk(results, requestId);
});
