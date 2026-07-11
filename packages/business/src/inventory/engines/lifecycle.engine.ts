import type { InventoryLifecycleStage, InventoryStatus, Prisma } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { LifecycleEventRepository } from '../repositories/lifecycle-event.repository.js';
import type { InventoryItemRepository } from '../repositories/inventory-item.repository.js';
import type { LockEngine } from './lock.engine.js';

const ALLOWED_TRANSITIONS: Record<InventoryLifecycleStage, InventoryLifecycleStage[]> = {
  RECEIVED: ['AVAILABLE', 'DAMAGED', 'ARCHIVED'],
  AVAILABLE: [
    'RESERVED',
    'WITH_SALES',
    'IN_TRANSIT',
    'TRANSFERRED',
    'IN_WORKSHOP',
    'REPAIR',
    'MANUFACTURING',
    'DAMAGED',
    'LOST',
    'ARCHIVED',
  ],
  RESERVED: ['AVAILABLE', 'WITH_SALES', 'PENDING_PAYMENT', 'SOLD', 'ARCHIVED'],
  WITH_SALES: ['PENDING_PAYMENT', 'SOLD', 'AVAILABLE', 'ARCHIVED'],
  PENDING_PAYMENT: ['SOLD', 'AVAILABLE', 'ARCHIVED'],
  SOLD: ['RETURNED', 'BUYBACK', 'TRADE_IN', 'ARCHIVED'],
  RETURNED: ['AVAILABLE', 'DAMAGED', 'REPAIR', 'ARCHIVED'],
  TRANSFERRED: ['AVAILABLE', 'IN_TRANSIT', 'ARCHIVED'],
  IN_TRANSIT: ['AVAILABLE', 'TRANSFERRED', 'DAMAGED', 'LOST', 'ARCHIVED'],
  IN_WORKSHOP: ['AVAILABLE', 'REPAIR', 'DAMAGED', 'ARCHIVED'],
  REPAIR: ['AVAILABLE', 'IN_WORKSHOP', 'DAMAGED', 'ARCHIVED'],
  MANUFACTURING: ['AVAILABLE', 'DAMAGED', 'ARCHIVED'],
  BUYBACK: ['AVAILABLE', 'ARCHIVED'],
  TRADE_IN: ['AVAILABLE', 'ARCHIVED'],
  DAMAGED: ['REPAIR', 'ARCHIVED'],
  LOST: ['ARCHIVED'],
  ARCHIVED: [],
};

const STAGE_STATUS_MAP: Partial<Record<InventoryLifecycleStage, InventoryStatus>> = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SOLD: 'SOLD',
  IN_TRANSIT: 'IN_TRANSIT',
  DAMAGED: 'DAMAGED',
  RETURNED: 'RETURNED',
};

export interface LifecycleTransitionParams {
  tenantId: string;
  inventoryItemId: string;
  toStage: InventoryLifecycleStage;
  reason?: string | null;
  performedById?: string | null;
  branchId?: string | null;
  toStatus?: InventoryStatus | null;
  skipLockCheck?: boolean;
}

export class LifecycleEngine {
  constructor(
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly lifecycleEventRepository: LifecycleEventRepository,
    private readonly lockEngine: LockEngine,
  ) {}

  validateTransition(fromStage: InventoryLifecycleStage, toStage: InventoryLifecycleStage) {
    if (fromStage === toStage) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Item is already in this lifecycle stage',
      );
    }

    const allowed = ALLOWED_TRANSITIONS[fromStage];
    if (!allowed.includes(toStage)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        `Cannot transition from ${fromStage} to ${toStage}`,
      );
    }
  }

  async transition(params: LifecycleTransitionParams) {
    const item = await this.inventoryItemRepository.findById(
      params.tenantId,
      params.inventoryItemId,
    );
    if (!item) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Inventory item not found');
    }

    if (!params.skipLockCheck) {
      const locked = await this.lockEngine.isLocked(params.tenantId, params.inventoryItemId);
      if (locked) {
        throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Inventory item is locked');
      }
    }

    this.validateTransition(item.lifecycleStage, params.toStage);

    const fromStage = item.lifecycleStage;
    const fromStatus = item.status;
    const toStatus = params.toStatus ?? STAGE_STATUS_MAP[params.toStage] ?? item.status;

    const updated = await this.inventoryItemRepository.update(
      params.tenantId,
      params.inventoryItemId,
      {
        lifecycleStage: params.toStage,
        status: toStatus,
      },
    );

    const event = await this.lifecycleEventRepository.create(params.tenantId, {
      inventoryItem: { connect: { id: params.inventoryItemId } },
      fromStage,
      toStage: params.toStage,
      fromStatus,
      toStatus,
      reason: params.reason ?? null,
      ...(params.performedById ? { performedBy: { connect: { id: params.performedById } } } : {}),
      ...(params.branchId ? { branch: { connect: { id: params.branchId } } } : {}),
    } satisfies Omit<Prisma.AssetLifecycleEventCreateInput, 'tenant'>);

    return { item: updated, event };
  }
}
