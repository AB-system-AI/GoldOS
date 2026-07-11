import { z } from 'zod';

import { parseInput } from '../../services/validation.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { ProductRepository } from '../repositories/product.repository.js';

const searchSchema = z.object({
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  sku: z.string().optional(),
  serialNumber: z.string().optional(),
  assetId: z.string().optional(),
  certificateNumber: z.string().optional(),
  branchId: z.string().uuid().optional(),
  weightMin: z.number().optional(),
  weightMax: z.number().optional(),
  purityMin: z.number().optional(),
  purityMax: z.number().optional(),
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional(),
});

export class InventorySearchService {
  constructor(
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async search(tenantId: string, input: unknown) {
    const filters = parseInput(searchSchema, input);

    if (filters.sku) {
      const product = await this.productRepository.findBySku(tenantId, filters.sku);
      if (!product) return { items: [], products: [] };

      const items = await this.inventoryItemRepository.list(tenantId, {
        productId: product.id,
        branchId: filters.branchId,
        skip: filters.skip,
        take: filters.take ?? 50,
      });

      return this.applyWeightPurityFilters({ items, products: [product] }, filters);
    }

    const items = await this.inventoryItemRepository.search(tenantId, {
      barcode: filters.barcode,
      qrCode: filters.qrCode,
      assetId: filters.assetId,
      serialNumber: filters.serialNumber,
      certificateNumber: filters.certificateNumber,
      branchId: filters.branchId,
      skip: filters.skip,
      take: filters.take,
    });

    return this.applyWeightPurityFilters({ items, products: [] }, filters);
  }

  private applyWeightPurityFilters(
    result: { items: Awaited<ReturnType<InventoryItemRepository['search']>>; products: unknown[] },
    filters: z.infer<typeof searchSchema>,
  ) {
    let items = result.items;

    if (filters.weightMin !== undefined || filters.weightMax !== undefined) {
      items = items.filter((item) => {
        const weight = item.weightActual ? Number(item.weightActual) : null;
        if (weight === null) return false;
        if (filters.weightMin !== undefined && weight < filters.weightMin) return false;
        if (filters.weightMax !== undefined && weight > filters.weightMax) return false;
        return true;
      });
    }

    if (filters.purityMin !== undefined || filters.purityMax !== undefined) {
      items = items.filter((item) => {
        const purity = item.product.goldItem?.purity ? Number(item.product.goldItem.purity) : null;
        if (purity === null) return false;
        if (filters.purityMin !== undefined && purity < filters.purityMin) return false;
        if (filters.purityMax !== undefined && purity > filters.purityMax) return false;
        return true;
      });
    }

    return { ...result, items };
  }
}
