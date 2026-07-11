import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, asJsonOptional, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { InventoryLotRepository } from '../repositories/inventory-lot.repository.js';

const createLotSchema = z.object({
  lotNumber: z.string().min(1).max(50),
  receivedAt: z.coerce.date().optional(),
  expiryAt: z.coerce.date().optional().nullable(),
  supplierRef: z.string().max(100).optional().nullable(),
  totalWeight: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateLotSchema = createLotSchema.partial().omit({ lotNumber: true });

export class InventoryLotService {
  constructor(
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.inventoryLotRepository.findById(tenantId, id),
      'Inventory lot not found',
    );
  }

  list(tenantId: string, filters?: Parameters<InventoryLotRepository['list']>[1]) {
    return this.inventoryLotRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createLotSchema, input);
    const existing = await this.inventoryLotRepository.findByLotNumber(tenantId, data.lotNumber);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Lot number already exists');
    }

    const lot = await this.inventoryLotRepository.create(tenantId, {
      lotNumber: data.lotNumber,
      receivedAt: data.receivedAt ?? new Date(),
      expiryAt: data.expiryAt ?? null,
      supplierRef: data.supplierRef ?? null,
      totalWeight: data.totalWeight ?? null,
      notes: data.notes ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'inventory_lot',
      entityId: lot.id,
      newValues: lot,
      context,
    });

    return lot;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.inventoryLotRepository.findById(tenantId, id),
      'Inventory lot not found',
    );
    const data = parseInput(updateLotSchema, input);

    const lot = await assertFound(
      this.inventoryLotRepository.update(tenantId, id, {
        receivedAt: data.receivedAt,
        expiryAt: data.expiryAt,
        supplierRef: data.supplierRef,
        totalWeight: data.totalWeight,
        notes: data.notes,
        metadata: asJsonOptional(data.metadata),
      }),
      'Inventory lot not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'inventory_lot',
      entityId: id,
      oldValues: existing,
      newValues: lot,
      context,
    });

    return lot;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.inventoryLotRepository.findById(tenantId, id),
      'Inventory lot not found',
    );
    await this.inventoryLotRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'inventory_lot',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
