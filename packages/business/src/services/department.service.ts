import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { DepartmentRepository } from '../repositories/department.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, assertTenantRef, parseInput } from './validation.js';

const createDepartmentSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

export class DepartmentService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.departmentRepository.findById(tenantId, id), 'Department not found');
  }

  list(tenantId: string, filters?: Parameters<DepartmentRepository['list']>[1]) {
    return this.departmentRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createDepartmentSchema, input);
    const existing = await this.departmentRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Department code already exists');
    }

    if (data.parentId) {
      const parentId = data.parentId;
      await assertTenantRef(
        () => this.departmentRepository.findById(tenantId, parentId),
        'Parent department not found in tenant',
      );
    }

    const department = await this.departmentRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive,
      ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'department',
      entityId: department.id,
      newValues: department,
      context,
    });

    return department;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.departmentRepository.findById(tenantId, id),
      'Department not found',
    );
    const data = parseInput(updateDepartmentSchema, input);

    if (data.parentId) {
      const parentId = data.parentId;
      if (parentId === id) {
        throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Department cannot be its own parent');
      }
      await assertTenantRef(
        () => this.departmentRepository.findById(tenantId, parentId),
        'Parent department not found in tenant',
      );
    }

    const department = await assertFound(
      this.departmentRepository.update(tenantId, id, {
        ...data,
        ...(data.parentId !== undefined
          ? data.parentId
            ? { parent: { connect: { id: data.parentId } } }
            : { parent: { disconnect: true } }
          : {}),
      }),
      'Department not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'department',
      entityId: id,
      oldValues: existing,
      newValues: department,
      context,
    });

    return department;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.departmentRepository.findById(tenantId, id),
      'Department not found',
    );
    await this.departmentRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'department',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
