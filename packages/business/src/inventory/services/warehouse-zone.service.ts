import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { WarehouseZoneRepository } from '../repositories/warehouse-zone.repository.js';

const createZoneSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  aisle: z.string().max(20).optional().nullable(),
  rack: z.string().max(20).optional().nullable(),
  shelf: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateZoneSchema = createZoneSchema.partial().omit({ branchId: true, code: true });

export class WarehouseZoneService {
  constructor(
    private readonly warehouseZoneRepository: WarehouseZoneRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.warehouseZoneRepository.findById(tenantId, id),
      'Warehouse zone not found',
    );
  }

  list(tenantId: string, filters?: Parameters<WarehouseZoneRepository['list']>[1]) {
    return this.warehouseZoneRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createZoneSchema, input);

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const existing = await this.warehouseZoneRepository.findByCode(
      tenantId,
      data.branchId,
      data.code,
    );
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.ALREADY_EXISTS,
        'Zone code already exists for branch',
      );
    }

    const zone = await this.warehouseZoneRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      aisle: data.aisle ?? null,
      rack: data.rack ?? null,
      shelf: data.shelf ?? null,
      isActive: data.isActive,
      branch: { connect: { id: data.branchId } },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'warehouse_zone',
      entityId: zone.id,
      newValues: zone,
      context,
    });

    return zone;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.warehouseZoneRepository.findById(tenantId, id),
      'Warehouse zone not found',
    );
    const data = parseInput(updateZoneSchema, input);

    const zone = await assertFound(
      this.warehouseZoneRepository.update(tenantId, id, {
        name: data.name,
        aisle: data.aisle,
        rack: data.rack,
        shelf: data.shelf,
        isActive: data.isActive,
      }),
      'Warehouse zone not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'warehouse_zone',
      entityId: id,
      oldValues: existing,
      newValues: zone,
      context,
    });

    return zone;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.warehouseZoneRepository.findById(tenantId, id),
      'Warehouse zone not found',
    );
    await this.warehouseZoneRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'warehouse_zone',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
