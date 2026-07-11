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
import type { ReservationRepository } from '../repositories/reservation.repository.js';

const createReservationSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  inventoryItemId: z.string().uuid(),
  reservationNo: z.string().max(30).optional(),
  depositAmount: z.number().optional().nullable(),
  expiresAt: z.coerce.date(),
  notes: z.string().optional().nullable(),
});

export class ReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly skuGenerator: SkuGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly lockEngine: LockEngine,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.reservationRepository.findById(tenantId, id), 'Reservation not found');
  }

  list(tenantId: string, filters?: Parameters<ReservationRepository['list']>[1]) {
    return this.reservationRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createReservationSchema, input);

    if (data.expiresAt <= new Date()) {
      throw new BusinessError(BusinessErrorCodes.VALIDATION_ERROR, 'Expiry must be in the future');
    }

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasCustomer(tenantId, data.customerId),
      'Customer not found in tenant',
    );

    const item = await assertFound(
      this.inventoryItemRepository.findById(tenantId, data.inventoryItemId),
      'Inventory item not found',
    );

    if (item.branchId !== data.branchId) {
      throw new BusinessError(
        BusinessErrorCodes.TENANT_MISMATCH,
        'Inventory item does not belong to the specified branch',
      );
    }

    const reservationNo =
      data.reservationNo ??
      (await this.skuGenerator.next(tenantId, { prefix: 'RSV', productType: 'RESERVATION' }));

    const reservation = await this.reservationRepository.create(tenantId, {
      reservationNo,
      depositAmount: data.depositAmount ?? null,
      expiresAt: data.expiresAt,
      notes: data.notes ?? null,
      status: 'ACTIVE',
      branch: { connect: { id: data.branchId } },
      customer: { connect: { id: data.customerId } },
      inventoryItem: { connect: { id: data.inventoryItemId } },
    });

    await this.lockEngine.acquire({
      tenantId,
      inventoryItemId: data.inventoryItemId,
      lockType: 'MANUAL',
      referenceType: 'reservation',
      referenceId: reservation.id,
      lockedById: context?.userId ?? null,
      expiresAt: data.expiresAt,
      reason: `Reserved: ${reservationNo}`,
    });

    await this.lifecycleEngine.transition({
      tenantId,
      inventoryItemId: data.inventoryItemId,
      toStage: 'RESERVED',
      reason: `Reservation ${reservationNo}`,
      branchId: data.branchId,
      skipLockCheck: true,
    });

    await this.inventoryItemRepository.update(tenantId, data.inventoryItemId, {
      status: 'RESERVED',
    });

    await this.movementEngine.record({
      tenantId,
      branchId: data.branchId,
      inventoryItemId: data.inventoryItemId,
      type: 'RESERVATION',
      referenceType: 'reservation',
      referenceId: reservation.id,
      performedById: context?.userId ?? null,
      auditContext: context,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'reservation',
      entityId: reservation.id,
      newValues: reservation,
      context,
    });

    return reservation;
  }

  async release(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.reservationRepository.findById(tenantId, id),
      'Reservation not found',
    );

    if (existing.status !== 'ACTIVE') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Reservation is not active');
    }

    const reservation = await assertFound(
      this.reservationRepository.update(tenantId, id, { status: 'CANCELLED' }),
      'Reservation not found',
    );

    await this.lockEngine.releaseByReference(tenantId, 'reservation', id);

    await this.lifecycleEngine.transition({
      tenantId,
      inventoryItemId: existing.inventoryItemId,
      toStage: 'AVAILABLE',
      reason: `Reservation ${existing.reservationNo} released`,
      branchId: existing.branchId,
      skipLockCheck: true,
    });

    await this.inventoryItemRepository.update(tenantId, existing.inventoryItemId, {
      status: 'AVAILABLE',
    });

    await this.movementEngine.record({
      tenantId,
      branchId: existing.branchId,
      inventoryItemId: existing.inventoryItemId,
      type: 'RELEASE',
      referenceType: 'reservation',
      referenceId: id,
      performedById: context?.userId ?? null,
      auditContext: context,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'reservation',
      entityId: id,
      oldValues: existing,
      newValues: reservation,
      context,
    });

    return reservation;
  }

  async expireStale(tenantId: string, context?: AuditContext) {
    const expired = await this.reservationRepository.listExpiredActive(tenantId);
    const results = [];

    for (const reservation of expired) {
      await this.reservationRepository.update(tenantId, reservation.id, { status: 'EXPIRED' });
      await this.lockEngine.releaseByReference(tenantId, 'reservation', reservation.id);

      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: reservation.inventoryItemId,
        toStage: 'AVAILABLE',
        reason: `Reservation ${reservation.reservationNo} expired`,
        branchId: reservation.branchId,
        skipLockCheck: true,
      });

      await this.inventoryItemRepository.update(tenantId, reservation.inventoryItemId, {
        status: 'AVAILABLE',
      });

      await this.movementEngine.record({
        tenantId,
        branchId: reservation.branchId,
        inventoryItemId: reservation.inventoryItemId,
        type: 'RELEASE',
        referenceType: 'reservation',
        referenceId: reservation.id,
        reason: 'Auto-expired reservation',
        performedById: context?.userId ?? null,
        auditContext: context,
      });

      results.push(reservation.id);
    }

    return { expiredCount: results.length, reservationIds: results };
  }
}
