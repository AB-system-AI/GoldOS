import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { WorkshopRepository } from '../repositories/workshop.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, asJsonOptional, parseInput } from './validation.js';

const createWorkshopSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).optional(),
  capacity: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateWorkshopSchema = createWorkshopSchema.partial().omit({ code: true });

export class WorkshopService {
  constructor(
    private readonly workshopRepository: WorkshopRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.workshopRepository.findById(tenantId, id), 'Workshop not found');
  }

  list(tenantId: string, filters?: Parameters<WorkshopRepository['list']>[1]) {
    return this.workshopRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createWorkshopSchema, input);
    const existing = await this.workshopRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Workshop code already exists');
    }

    const workshop = await this.workshopRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      status: data.status,
      capacity: data.capacity ?? null,
      description: data.description ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
      ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'workshop',
      entityId: workshop.id,
      newValues: workshop,
      context,
    });

    return workshop;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.workshopRepository.findById(tenantId, id),
      'Workshop not found',
    );
    const data = parseInput(updateWorkshopSchema, input);
    const workshop = await this.workshopRepository.update(tenantId, id, {
      name: data.name,
      status: data.status,
      capacity: data.capacity,
      description: data.description,
      metadata: asJsonOptional(data.metadata),
      ...(data.branchId !== undefined
        ? data.branchId
          ? { branch: { connect: { id: data.branchId } } }
          : { branch: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'workshop',
      entityId: id,
      oldValues: existing,
      newValues: workshop,
      context,
    });

    return workshop;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.workshopRepository.findById(tenantId, id),
      'Workshop not found',
    );
    await this.workshopRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'workshop',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
