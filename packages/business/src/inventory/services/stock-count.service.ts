import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { SkuGenerator } from '../engines/sku-generator.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { StockCountRepository } from '../repositories/stock-count.repository.js';

const createStockCountSchema = z.object({
  branchId: z.string().uuid(),
  countNo: z.string().max(30).optional(),
  isCycleCount: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  inventoryItemIds: z.array(z.string().uuid()).optional(),
});

const recordLineSchema = z.object({
  inventoryItemId: z.string().uuid(),
  countedQty: z.number().int().min(0),
  notes: z.string().optional().nullable(),
});

const stockCountActionSchema = z.object({
  action: z.enum(['start', 'recordLine', 'complete']),
  line: recordLineSchema.optional(),
});

export class StockCountService {
  constructor(
    private readonly stockCountRepository: StockCountRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly skuGenerator: SkuGenerator,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.stockCountRepository.findById(tenantId, id), 'Stock count not found');
  }

  list(tenantId: string, filters?: Parameters<StockCountRepository['list']>[1]) {
    return this.stockCountRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createStockCountSchema, input);

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const countNo =
      data.countNo ??
      (await this.skuGenerator.next(tenantId, { prefix: 'CNT', productType: 'STOCK_COUNT' }));

    let itemIds = data.inventoryItemIds;
    if (!itemIds || itemIds.length === 0) {
      const items = await this.inventoryItemRepository.list(tenantId, {
        branchId: data.branchId,
        take: 500,
      });
      itemIds = items.map((item) => item.id);
    } else {
      for (const inventoryItemId of itemIds) {
        const item = await assertFound(
          this.inventoryItemRepository.findById(tenantId, inventoryItemId),
          'Inventory item not found',
        );
        if (item.branchId !== data.branchId) {
          throw new BusinessError(
            BusinessErrorCodes.TENANT_MISMATCH,
            'Inventory item does not belong to the specified branch',
          );
        }
      }
    }

    const stockCount = await this.stockCountRepository.create(tenantId, {
      countNo,
      isCycleCount: data.isCycleCount ?? false,
      notes: data.notes ?? null,
      status: 'DRAFT',
      branch: { connect: { id: data.branchId } },
      lines: {
        create: itemIds.map((inventoryItemId) => ({
          inventoryItem: { connect: { id: inventoryItemId } },
          expectedQty: 1,
        })),
      },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'stock_count',
      entityId: stockCount.id,
      newValues: stockCount,
      context,
    });

    return stockCount;
  }

  async start(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Stock count has already started');
    }

    const stockCount = await assertFound(
      this.stockCountRepository.update(tenantId, id, {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      }),
      'Stock count not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'stock_count',
      entityId: id,
      oldValues: existing,
      newValues: stockCount,
      context,
    });

    return stockCount;
  }

  async recordLine(tenantId: string, stockCountId: string, input: unknown, context?: AuditContext) {
    const stockCount = await this.getById(tenantId, stockCountId);
    if (stockCount.status !== 'IN_PROGRESS') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Stock count is not in progress');
    }

    const data = parseInput(recordLineSchema, input);
    const line = stockCount.lines.find((l) => l.inventoryItemId === data.inventoryItemId);
    if (!line) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Stock count line not found for item');
    }

    const variance = data.countedQty - line.expectedQty;
    const updated = await assertFound(
      this.stockCountRepository.updateLine(stockCountId, line.id, {
        countedQty: data.countedQty,
        variance,
        notes: data.notes ?? null,
      }),
      'Stock count line not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'stock_count_line',
      entityId: line.id,
      newValues: updated,
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'IN_PROGRESS') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Stock count is not in progress');
    }

    const stockCount = await assertFound(
      this.stockCountRepository.update(tenantId, id, {
        status: 'COMPLETED',
        completedAt: new Date(),
      }),
      'Stock count not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'stock_count',
      entityId: id,
      oldValues: existing,
      newValues: stockCount,
      context,
    });

    return stockCount;
  }

  async handleAction(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(stockCountActionSchema, input);

    switch (data.action) {
      case 'start':
        return this.start(tenantId, id, context);
      case 'recordLine':
        return this.recordLine(tenantId, id, data.line, context);
      case 'complete':
        return this.complete(tenantId, id, context);
    }
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Only draft stock counts can be deleted',
      );
    }
    await this.stockCountRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'stock_count',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
