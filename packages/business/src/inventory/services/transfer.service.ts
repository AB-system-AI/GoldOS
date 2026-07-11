import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { LifecycleEngine } from '../engines/lifecycle.engine.js';
import type { LockEngine } from '../engines/lock.engine.js';
import type { MovementEngine } from '../engines/movement.engine.js';
import type { SkuGenerator } from '../engines/sku-generator.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { TransferRepository } from '../repositories/transfer.repository.js';

const createTransferSchema = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  transferNo: z.string().max(30).optional(),
  notes: z.string().optional().nullable(),
  requestedById: z.string().uuid().optional().nullable(),
  lines: z
    .array(
      z.object({
        inventoryItemId: z.string().uuid(),
        quantity: z.number().int().positive().optional(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

const rejectTransferSchema = z.object({
  rejectionReason: z.string().min(1),
  rejectedById: z.string().uuid().optional().nullable(),
});

export class TransferService {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly skuGenerator: SkuGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly lockEngine: LockEngine,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.transferRepository.findById(tenantId, id), 'Transfer not found');
  }

  list(tenantId: string, filters?: Parameters<TransferRepository['list']>[1]) {
    return this.transferRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createTransferSchema, input);

    if (data.fromBranchId === data.toBranchId) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Source and destination branches must differ',
      );
    }

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.fromBranchId),
      'Source branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.toBranchId),
      'Destination branch not found in tenant',
    );

    for (const line of data.lines) {
      const item = await assertFound(
        this.inventoryItemRepository.findById(tenantId, line.inventoryItemId),
        'Inventory item not found',
      );
      if (item.branchId !== data.fromBranchId) {
        throw new BusinessError(
          BusinessErrorCodes.TENANT_MISMATCH,
          'Inventory item does not belong to source branch',
        );
      }
      if (item.lifecycleStage !== 'AVAILABLE') {
        throw new BusinessError(
          BusinessErrorCodes.CONFLICT,
          'Only available inventory items can be transferred',
        );
      }
      if (await this.lockEngine.isLocked(tenantId, line.inventoryItemId)) {
        throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Inventory item is locked');
      }
    }

    const transferNo =
      data.transferNo ??
      (await this.skuGenerator.next(tenantId, { prefix: 'TRF', productType: 'TRANSFER' }));

    const transfer = await this.transferRepository.create(tenantId, {
      transferNo,
      notes: data.notes ?? null,
      status: 'DRAFT',
      fromBranch: { connect: { id: data.fromBranchId } },
      toBranch: { connect: { id: data.toBranchId } },
      ...(data.requestedById ? { requestedBy: { connect: { id: data.requestedById } } } : {}),
      lines: {
        create: data.lines.map((line) => ({
          inventoryItem: { connect: { id: line.inventoryItemId } },
          quantity: line.quantity ?? 1,
          notes: line.notes ?? null,
        })),
      },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'transfer',
      entityId: transfer.id,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft transfers can be submitted');
    }

    const transfer = await assertFound(
      this.transferRepository.update(tenantId, id, { status: 'PENDING_APPROVAL' }),
      'Transfer not found',
    );

    await this.transferRepository.createApproval(tenantId, {
      approvalType: 'TRANSFER',
      status: 'PENDING',
      entityType: 'transfer',
      entityId: id,
      transfer: { connect: { id } },
      ...(context?.userId ? { requestedBy: { connect: { id: context.userId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async approve(tenantId: string, id: string, approvedById?: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Transfer is not pending approval');
    }

    const approverId = approvedById ?? context?.userId;
    const transfer = await assertFound(
      this.transferRepository.update(tenantId, id, {
        status: 'APPROVED',
        approvedAt: new Date(),
        ...(approverId ? { approvedBy: { connect: { id: approverId } } } : {}),
      }),
      'Transfer not found',
    );

    for (const line of existing.lines) {
      await this.lockEngine.acquire({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        lockType: 'TRANSFER',
        referenceType: 'transfer',
        referenceId: id,
        lockedById: approverId ?? null,
        reason: `Locked for transfer ${existing.transferNo}`,
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async reject(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Transfer is not pending approval');
    }

    const data = parseInput(rejectTransferSchema, input);
    const rejectorId = data.rejectedById ?? context?.userId;

    const transfer = await assertFound(
      this.transferRepository.update(tenantId, id, {
        status: 'REJECTED',
        rejectionReason: data.rejectionReason,
        rejectedAt: new Date(),
        ...(rejectorId ? { rejectedBy: { connect: { id: rejectorId } } } : {}),
      }),
      'Transfer not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async ship(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'APPROVED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Only approved transfers can be shipped',
      );
    }

    for (const line of existing.lines) {
      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        toStage: 'IN_TRANSIT',
        reason: `Shipped on transfer ${existing.transferNo}`,
        branchId: existing.fromBranchId,
        skipLockCheck: true,
      });

      await this.movementEngine.record({
        tenantId,
        branchId: existing.fromBranchId,
        inventoryItemId: line.inventoryItemId,
        type: 'TRANSFER_OUT',
        quantity: line.quantity,
        referenceType: 'transfer',
        referenceId: id,
        performedById: context?.userId ?? null,
        auditContext: context,
      });

      await this.inventoryItemRepository.update(tenantId, line.inventoryItemId, {
        status: 'IN_TRANSIT',
      });
    }

    const transfer = await assertFound(
      this.transferRepository.update(tenantId, id, {
        status: 'IN_TRANSIT',
        shippedAt: new Date(),
      }),
      'Transfer not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async receive(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (existing.status !== 'IN_TRANSIT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Transfer is not in transit');
    }

    for (const line of existing.lines) {
      await this.inventoryItemRepository.update(tenantId, line.inventoryItemId, {
        branch: { connect: { id: existing.toBranchId } },
        status: 'AVAILABLE',
      });

      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        toStage: 'AVAILABLE',
        reason: `Received on transfer ${existing.transferNo}`,
        branchId: existing.toBranchId,
        skipLockCheck: true,
      });

      await this.movementEngine.record({
        tenantId,
        branchId: existing.toBranchId,
        inventoryItemId: line.inventoryItemId,
        type: 'TRANSFER_IN',
        quantity: line.quantity,
        referenceType: 'transfer',
        referenceId: id,
        performedById: context?.userId ?? null,
        auditContext: context,
      });

      await this.lockEngine.releaseByReference(tenantId, 'transfer', id, 'TRANSFER');
    }

    const transfer = await assertFound(
      this.transferRepository.update(tenantId, id, {
        status: 'RECEIVED',
        receivedAt: new Date(),
      }),
      'Transfer not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      newValues: transfer,
      context,
    });

    return transfer;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Only draft or rejected transfers can be deleted',
      );
    }

    await this.transferRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'transfer',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
