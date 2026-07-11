import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { LifecycleEngine } from '../engines/lifecycle.engine.js';
import type { MovementEngine } from '../engines/movement.engine.js';
import type { SkuGenerator } from '../engines/sku-generator.js';
import type { InventoryAdjustmentRepository } from '../repositories/inventory-adjustment.repository.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';

const createAdjustmentSchema = z.object({
  branchId: z.string().uuid(),
  adjustmentNo: z.string().max(30).optional(),
  reasonCode: z.enum(['DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'SHRINKAGE', 'THEFT', 'OTHER']),
  notes: z.string().optional().nullable(),
  requestedById: z.string().uuid().optional().nullable(),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantityDelta: z.number().int(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export class InventoryAdjustmentService {
  constructor(
    private readonly inventoryAdjustmentRepository: InventoryAdjustmentRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly skuGenerator: SkuGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.inventoryAdjustmentRepository.findById(tenantId, id),
      'Inventory adjustment not found',
    );
  }

  list(tenantId: string, filters?: Parameters<InventoryAdjustmentRepository['list']>[1]) {
    return this.inventoryAdjustmentRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createAdjustmentSchema, input);

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    for (const line of data.lines) {
      const item = await assertFound(
        this.inventoryItemRepository.findById(tenantId, line.inventoryItemId),
        'Inventory item not found',
      );
      if (item.branchId !== data.branchId) {
        throw new BusinessError(
          BusinessErrorCodes.TENANT_MISMATCH,
          'Inventory item does not belong to the specified branch',
        );
      }
    }

    const adjustmentNo =
      data.adjustmentNo ??
      (await this.skuGenerator.next(tenantId, { prefix: 'ADJ', productType: 'ADJUSTMENT' }));

    const adjustment = await this.inventoryAdjustmentRepository.create(tenantId, {
      adjustmentNo,
      reasonCode: data.reasonCode,
      notes: data.notes ?? null,
      status: 'DRAFT',
      branch: { connect: { id: data.branchId } },
      ...(data.requestedById ? { requestedBy: { connect: { id: data.requestedById } } } : {}),
      lines: {
        create: data.lines.map((line) => ({
          inventoryItem: { connect: { id: line.inventoryItemId } },
          quantityDelta: line.quantityDelta,
          notes: line.notes ?? null,
        })),
      },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_adjustment',
      entityId: adjustment.id,
      newValues: adjustment,
      context,
    });

    return adjustment;
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Only draft adjustments can be submitted',
      );
    }

    const adjustment = await assertFound(
      this.inventoryAdjustmentRepository.update(tenantId, id, { status: 'PENDING' }),
      'Inventory adjustment not found',
    );

    await this.inventoryAdjustmentRepository.createApproval(tenantId, {
      approvalType: 'ADJUSTMENT',
      status: 'PENDING',
      entityType: 'inventory_adjustment',
      entityId: id,
      adjustment: { connect: { id } },
      ...(context?.userId ? { requestedBy: { connect: { id: context.userId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_adjustment',
      entityId: id,
      oldValues: existing,
      newValues: adjustment,
      context,
    });

    return adjustment;
  }

  async approve(tenantId: string, id: string, approvedById?: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'PENDING') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Adjustment is not pending approval');
    }

    const approverId = approvedById ?? context?.userId;

    for (const line of existing.lines) {
      await this.movementEngine.record({
        tenantId,
        branchId: existing.branchId,
        inventoryItemId: line.inventoryItemId,
        type: 'ADJUSTMENT',
        quantity: Math.abs(line.quantityDelta),
        referenceType: 'inventory_adjustment',
        referenceId: id,
        reason: existing.reasonCode,
        performedById: approverId ?? null,
        auditContext: context,
      });

      if (line.quantityDelta < 0) {
        const toStage =
          existing.reasonCode === 'LOSS' || existing.reasonCode === 'THEFT' ? 'LOST' : 'DAMAGED';

        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage,
          toStatus: toStage === 'LOST' ? 'QUARANTINE' : 'DAMAGED',
          reason: `Adjustment ${existing.adjustmentNo}: ${existing.reasonCode}`,
          branchId: existing.branchId,
          performedById: approverId ?? null,
          skipLockCheck: true,
        });
      }
    }

    const adjustment = await assertFound(
      this.inventoryAdjustmentRepository.update(tenantId, id, {
        status: 'APPROVED',
        approvedAt: new Date(),
        ...(approverId ? { approvedBy: { connect: { id: approverId } } } : {}),
      }),
      'Inventory adjustment not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_adjustment',
      entityId: id,
      oldValues: existing,
      newValues: adjustment,
      context,
    });

    return adjustment;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft adjustments can be deleted');
    }
    await this.inventoryAdjustmentRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'inventory_adjustment',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
