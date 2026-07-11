import type { Prisma, StockMovementType } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js';

export interface RecordMovementParams {
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity?: number;
  referenceType?: string | null;
  referenceId?: string | null;
  performedById?: string | null;
  deviceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  previousState?: unknown;
  newState?: unknown;
  occurredAt?: Date;
  auditContext?: AuditContext;
}

export class MovementEngine {
  constructor(
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly auditService: AuditService,
  ) {}

  async record(params: RecordMovementParams) {
    const item = await this.inventoryItemRepository.findById(
      params.tenantId,
      params.inventoryItemId,
    );
    if (!item) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Inventory item not found');
    }

    if (item.branchId !== params.branchId) {
      throw new BusinessError(
        BusinessErrorCodes.TENANT_MISMATCH,
        'Inventory item does not belong to the specified branch',
      );
    }

    const movement = await this.stockMovementRepository.create(params.tenantId, {
      branch: { connect: { id: params.branchId } },
      inventoryItem: { connect: { id: params.inventoryItemId } },
      type: params.type,
      quantity: params.quantity ?? 1,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      reason: params.reason ?? null,
      notes: params.notes ?? null,
      occurredAt: params.occurredAt,
      previousState:
        params.previousState !== undefined
          ? (params.previousState as Prisma.InputJsonValue)
          : {
              status: item.status,
              lifecycleStage: item.lifecycleStage,
              branchId: item.branchId,
            },
      newState:
        params.newState !== undefined
          ? (params.newState as Prisma.InputJsonValue)
          : {
              status: item.status,
              lifecycleStage: item.lifecycleStage,
              branchId: item.branchId,
            },
      ...(params.performedById ? { performedBy: { connect: { id: params.performedById } } } : {}),
      ...(params.deviceId ? { deviceId: params.deviceId } : {}),
    });

    await this.auditService.log({
      tenantId: params.tenantId,
      action: 'CREATE',
      entityType: 'stock_movement',
      entityId: movement.id,
      newValues: movement,
      context: params.auditContext,
    });

    return movement;
  }
}
