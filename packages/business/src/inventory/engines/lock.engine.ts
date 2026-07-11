import type { InventoryLockType, Prisma } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { InventoryLockRepository } from '../repositories/inventory-lock.repository.js';

export interface AcquireLockParams {
  tenantId: string;
  inventoryItemId: string;
  lockType: InventoryLockType;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  lockedById?: string | null;
  expiresAt?: Date | null;
}

export class LockEngine {
  constructor(
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly inventoryLockRepository: InventoryLockRepository,
  ) {}

  async isLocked(tenantId: string, inventoryItemId: string): Promise<boolean> {
    const item = await this.inventoryItemRepository.findById(tenantId, inventoryItemId);
    if (!item) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Inventory item not found');
    }

    const activeLocks = await this.inventoryLockRepository.countActive(tenantId, inventoryItemId);
    return item.isLocked || activeLocks > 0;
  }

  async acquire(params: AcquireLockParams) {
    const item = await this.inventoryItemRepository.findById(
      params.tenantId,
      params.inventoryItemId,
    );
    if (!item) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Inventory item not found');
    }

    const lock = await this.inventoryLockRepository.create(params.tenantId, {
      inventoryItem: { connect: { id: params.inventoryItemId } },
      lockType: params.lockType,
      reason: params.reason ?? null,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      expiresAt: params.expiresAt ?? null,
      ...(params.lockedById ? { lockedBy: { connect: { id: params.lockedById } } } : {}),
    } satisfies Omit<Prisma.InventoryLockCreateInput, 'tenant'>);

    await this.inventoryItemRepository.update(params.tenantId, params.inventoryItemId, {
      isLocked: true,
    });

    return lock;
  }

  async release(tenantId: string, lockId: string) {
    const lock = await this.inventoryLockRepository.findById(tenantId, lockId);
    if (!lock) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Inventory lock not found');
    }

    if (lock.releasedAt) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Lock is already released');
    }

    await this.inventoryLockRepository.release(tenantId, lockId);

    const remaining = await this.inventoryLockRepository.countActive(
      tenantId,
      lock.inventoryItemId,
    );
    if (remaining === 0) {
      await this.inventoryItemRepository.update(tenantId, lock.inventoryItemId, {
        isLocked: false,
      });
    }

    return { released: true, lockId };
  }

  async releaseByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
    lockType?: InventoryLockType,
  ) {
    const locks = await this.inventoryLockRepository.findActiveByReference(
      tenantId,
      referenceType,
      referenceId,
      lockType,
    );

    for (const lock of locks) {
      await this.release(tenantId, lock.id);
    }

    return { releasedCount: locks.length };
  }
}
