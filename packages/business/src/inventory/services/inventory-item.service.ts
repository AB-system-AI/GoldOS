import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import {
  assertFound,
  assertTenantRef,
  asJsonOptional,
  parseInput,
} from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { InventoryLockType } from '@goldos/database';

import type { AssetIdGenerator } from '../engines/asset-id.generator.js';
import type { LifecycleEngine } from '../engines/lifecycle.engine.js';
import type { LockEngine } from '../engines/lock.engine.js';
import type { MovementEngine } from '../engines/movement.engine.js';
import type { CustodyEventRepository } from '../repositories/custody-event.repository.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { InventoryLockRepository } from '../repositories/inventory-lock.repository.js';
import type { InventoryLotRepository } from '../repositories/inventory-lot.repository.js';
import type { LifecycleEventRepository } from '../repositories/lifecycle-event.repository.js';
import type { PriceHistoryRepository } from '../repositories/price-history.repository.js';
import type { WeightHistoryRepository } from '../repositories/weight-history.repository.js';

const receiveItemSchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  inventoryLotId: z.string().uuid().optional().nullable(),
  warehouseZoneId: z.string().uuid().optional().nullable(),
  serialNumber: z.string().min(1).max(50).optional(),
  barcode: z.string().max(50).optional().nullable(),
  qrCode: z.string().max(100).optional().nullable(),
  rfidTag: z.string().max(100).optional().nullable(),
  costPrice: z.number().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
  goldRateAtPurchase: z.number().optional().nullable(),
  weightActual: z.number().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  performedById: z.string().uuid().optional().nullable(),
});

const transitionLifecycleSchema = z.object({
  toStage: z.enum([
    'RECEIVED',
    'AVAILABLE',
    'RESERVED',
    'WITH_SALES',
    'PENDING_PAYMENT',
    'SOLD',
    'RETURNED',
    'TRANSFERRED',
    'IN_TRANSIT',
    'IN_WORKSHOP',
    'REPAIR',
    'MANUFACTURING',
    'BUYBACK',
    'TRADE_IN',
    'DAMAGED',
    'LOST',
    'ARCHIVED',
  ]),
  reason: z.string().optional().nullable(),
  performedById: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

const custodyEventSchema = z.object({
  branchId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  action: z.string().min(1).max(50),
  reason: z.string().optional().nullable(),
  newState: z.enum([
    'RECEIVED',
    'AVAILABLE',
    'RESERVED',
    'WITH_SALES',
    'PENDING_PAYMENT',
    'SOLD',
    'RETURNED',
    'TRANSFERRED',
    'IN_TRANSIT',
    'IN_WORKSHOP',
    'REPAIR',
    'MANUFACTURING',
    'BUYBACK',
    'TRADE_IN',
    'DAMAGED',
    'LOST',
    'ARCHIVED',
  ]),
});

const priceHistorySchema = z.object({
  priceType: z.enum([
    'PURCHASE_COST',
    'GOLD_COST',
    'MAKING_COST',
    'STONE_COST',
    'SELLING_PRICE',
    'MANUAL_ADJUSTMENT',
  ]),
  amount: z.number(),
  currency: z.string().length(3).optional(),
  reason: z.string().optional().nullable(),
  changedById: z.string().uuid().optional().nullable(),
});

const weightHistorySchema = z.object({
  grossWeight: z.number().optional().nullable(),
  netWeight: z.number().optional().nullable(),
  stoneWeight: z.number().optional().nullable(),
  goldWeight: z.number().optional().nullable(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional().nullable(),
  reason: z.string().optional().nullable(),
  measuredById: z.string().uuid().optional().nullable(),
});

const updateItemSchema = z.object({
  warehouseZoneId: z.string().uuid().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  qrCode: z.string().max(100).optional().nullable(),
  rfidTag: z.string().max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const acquireLockSchema = z.object({
  inventoryItemId: z.string().uuid(),
  lockType: z.enum(['STOCK_COUNT', 'TRANSFER', 'REPAIR', 'INVESTIGATION', 'MANUAL']),
  reason: z.string().optional().nullable(),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

export class InventoryItemService {
  constructor(
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly custodyEventRepository: CustodyEventRepository,
    private readonly lifecycleEventRepository: LifecycleEventRepository,
    private readonly priceHistoryRepository: PriceHistoryRepository,
    private readonly weightHistoryRepository: WeightHistoryRepository,
    private readonly inventoryLockRepository: InventoryLockRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly assetIdGenerator: AssetIdGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly lockEngine: LockEngine,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );
  }

  list(tenantId: string, filters?: Parameters<InventoryItemRepository['list']>[1]) {
    return this.inventoryItemRepository.list(tenantId, filters);
  }

  async receive(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(receiveItemSchema, input);

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasProduct(tenantId, data.productId),
      'Product not found in tenant',
    );
    if (data.inventoryLotId) {
      const inventoryLotId = data.inventoryLotId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasInventoryLot(tenantId, inventoryLotId),
        'Inventory lot not found in tenant',
      );
    }
    if (data.warehouseZoneId) {
      const warehouseZoneId = data.warehouseZoneId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasWarehouseZone(tenantId, warehouseZoneId),
        'Warehouse zone not found in tenant',
      );
    }
    if (data.supplierId) {
      const supplierId = data.supplierId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasSupplier(tenantId, supplierId),
        'Supplier not found in tenant',
      );
    }

    const assetId = await this.assetIdGenerator.next(tenantId);
    const serialNumber = data.serialNumber ?? assetId;

    const existingSerial = await this.inventoryItemRepository.findBySerialNumber(
      tenantId,
      serialNumber,
    );
    if (existingSerial) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Serial number already exists');
    }

    const item = await this.inventoryItemRepository.create(tenantId, {
      assetId,
      serialNumber,
      barcode: data.barcode ?? null,
      qrCode: data.qrCode ?? null,
      rfidTag: data.rfidTag ?? null,
      costPrice: data.costPrice ?? null,
      sellingPrice: data.sellingPrice ?? null,
      goldRateAtPurchase: data.goldRateAtPurchase ?? null,
      weightActual: data.weightActual ?? null,
      location: data.location ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
      branch: { connect: { id: data.branchId } },
      product: { connect: { id: data.productId } },
      ...(data.inventoryLotId ? { inventoryLot: { connect: { id: data.inventoryLotId } } } : {}),
      ...(data.warehouseZoneId ? { warehouseZone: { connect: { id: data.warehouseZoneId } } } : {}),
      ...(data.supplierId ? { supplier: { connect: { id: data.supplierId } } } : {}),
    });

    if (data.inventoryLotId) {
      await this.inventoryLotRepository.incrementTotalPieces(tenantId, data.inventoryLotId);
    }

    await this.movementEngine.record({
      tenantId,
      branchId: data.branchId,
      inventoryItemId: item.id,
      type: 'RECEIPT',
      referenceType: 'inventory_receipt',
      referenceId: item.id,
      performedById: data.performedById ?? context?.userId ?? null,
      newState: { status: item.status, lifecycleStage: item.lifecycleStage },
      auditContext: context,
    });

    const lifecycleResult = await this.lifecycleEngine.transition({
      tenantId,
      inventoryItemId: item.id,
      toStage: 'AVAILABLE',
      reason: 'Item received into inventory',
      performedById: data.performedById ?? context?.userId ?? null,
      branchId: data.branchId,
      skipLockCheck: true,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_item',
      entityId: item.id,
      newValues: lifecycleResult.item,
      context,
    });

    return lifecycleResult.item;
  }

  async transitionLifecycle(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );
    const data = parseInput(transitionLifecycleSchema, input);

    const result = await this.lifecycleEngine.transition({
      tenantId,
      inventoryItemId: id,
      toStage: data.toStage,
      reason: data.reason,
      performedById: data.performedById ?? context?.userId ?? null,
      branchId: data.branchId ?? existing.branchId,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_item',
      entityId: id,
      oldValues: existing,
      newValues: result.item,
      context,
    });

    return result;
  }

  async recordCustody(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const item = await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );
    const data = parseInput(custodyEventSchema, input);

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    if (data.employeeId) {
      const employeeId = data.employeeId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasEmployee(tenantId, employeeId),
        'Employee not found in tenant',
      );
    }

    const event = await this.custodyEventRepository.create(tenantId, {
      inventoryItem: { connect: { id } },
      branch: { connect: { id: data.branchId } },
      action: data.action,
      reason: data.reason ?? null,
      previousState: item.lifecycleStage,
      newState: data.newState,
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    });

    await this.lifecycleEngine.transition({
      tenantId,
      inventoryItemId: id,
      toStage: data.newState,
      reason: data.reason ?? `Custody: ${data.action}`,
      performedById: data.employeeId ?? context?.userId ?? null,
      branchId: data.branchId,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'custody_event',
      entityId: event.id,
      newValues: event,
      context,
    });

    return event;
  }

  async recordPriceHistory(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );
    const data = parseInput(priceHistorySchema, input);

    if (data.changedById) {
      const changedById = data.changedById;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasEmployee(tenantId, changedById),
        'Employee not found in tenant',
      );
    }

    const entry = await this.priceHistoryRepository.create(tenantId, {
      inventoryItem: { connect: { id } },
      priceType: data.priceType,
      amount: data.amount,
      currency: data.currency ?? 'SAR',
      reason: data.reason ?? null,
      ...(data.changedById ? { changedBy: { connect: { id: data.changedById } } } : {}),
    });

    if (data.priceType === 'PURCHASE_COST') {
      await this.inventoryItemRepository.update(tenantId, id, { costPrice: data.amount });
    } else if (data.priceType === 'SELLING_PRICE') {
      await this.inventoryItemRepository.update(tenantId, id, { sellingPrice: data.amount });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_price_history',
      entityId: entry.id,
      newValues: entry,
      context,
    });

    return entry;
  }

  async recordWeightHistory(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );
    const data = parseInput(weightHistorySchema, input);

    if (data.measuredById) {
      const measuredById = data.measuredById;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasEmployee(tenantId, measuredById),
        'Employee not found in tenant',
      );
    }

    const entry = await this.weightHistoryRepository.create(tenantId, {
      inventoryItem: { connect: { id } },
      grossWeight: data.grossWeight ?? null,
      netWeight: data.netWeight ?? null,
      stoneWeight: data.stoneWeight ?? null,
      goldWeight: data.goldWeight ?? null,
      karat: data.karat ?? null,
      reason: data.reason ?? null,
      ...(data.measuredById ? { measuredBy: { connect: { id: data.measuredById } } } : {}),
    });

    if (data.netWeight !== undefined && data.netWeight !== null) {
      await this.inventoryItemRepository.update(tenantId, id, { weightActual: data.netWeight });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_weight_history',
      entityId: entry.id,
      newValues: entry,
      context,
    });

    return entry;
  }

  listLifecycleHistory(tenantId: string, id: string, filters?: { skip?: number; take?: number }) {
    return this.lifecycleEventRepository.list(tenantId, { inventoryItemId: id, ...filters });
  }

  listCustodyEvents(tenantId: string, id: string, filters?: { skip?: number; take?: number }) {
    return this.custodyEventRepository.list(tenantId, { inventoryItemId: id, ...filters });
  }

  listPriceHistory(tenantId: string, id: string, filters?: { skip?: number; take?: number }) {
    return this.priceHistoryRepository.list(tenantId, { inventoryItemId: id, ...filters });
  }

  listWeightHistory(tenantId: string, id: string, filters?: { skip?: number; take?: number }) {
    return this.weightHistoryRepository.list(tenantId, { inventoryItemId: id, ...filters });
  }

  listLocks(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      lockType?: InventoryLockType;
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    return this.inventoryLockRepository.list(tenantId, filters);
  }

  async acquireLock(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(acquireLockSchema, input);
    const lock = await this.lockEngine.acquire({
      tenantId,
      inventoryItemId: data.inventoryItemId,
      lockType: data.lockType,
      reason: data.reason,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      lockedById: context?.userId ?? null,
      expiresAt: data.expiresAt,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_lock',
      entityId: lock.id,
      newValues: lock,
      context,
    });

    return lock;
  }

  async releaseLock(tenantId: string, lockId: string, context?: AuditContext) {
    const existing = await assertFound(
      this.inventoryLockRepository.findById(tenantId, lockId),
      'Inventory lock not found',
    );
    const result = await this.lockEngine.release(tenantId, lockId);

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_lock',
      entityId: lockId,
      oldValues: existing,
      newValues: result,
      context,
    });

    return result;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(updateItemSchema, input);
    const existing = await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );

    if (data.warehouseZoneId) {
      const warehouseZoneId = data.warehouseZoneId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasWarehouseZone(tenantId, warehouseZoneId),
        'Warehouse zone not found',
      );
    }

    if (data.barcode) {
      const existingBarcode = await this.inventoryItemRepository.findByBarcode(
        tenantId,
        data.barcode,
      );
      if (existingBarcode && existingBarcode.id !== id) {
        throw new BusinessError(
          BusinessErrorCodes.ALREADY_EXISTS,
          'Barcode already assigned to another item',
        );
      }
    }

    const updated = await assertFound(
      this.inventoryItemRepository.update(tenantId, id, {
        ...(data.warehouseZoneId !== undefined
          ? {
              warehouseZone: data.warehouseZoneId
                ? { connect: { id: data.warehouseZoneId } }
                : { disconnect: true },
            }
          : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode } : {}),
        ...(data.qrCode !== undefined ? { qrCode: data.qrCode } : {}),
        ...(data.rfidTag !== undefined ? { rfidTag: data.rfidTag } : {}),
        ...(data.metadata !== undefined ? { metadata: asJsonOptional(data.metadata) } : {}),
      }),
      'Inventory item not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_item',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      context,
    });

    return updated;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.inventoryItemRepository.findById(tenantId, id),
      'Inventory item not found',
    );

    const deletableStages = new Set(['RECEIVED', 'AVAILABLE', 'ARCHIVED']);
    if (!deletableStages.has(existing.lifecycleStage)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Inventory item cannot be deleted in its current lifecycle stage',
      );
    }

    if (await this.lockEngine.isLocked(tenantId, id)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Inventory item is locked');
    }

    await this.inventoryItemRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'inventory_item',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
