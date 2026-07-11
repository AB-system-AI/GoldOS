import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { CategoryRepository } from '../repositories/category.repository.js';

const createCategorySchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial().omit({ code: true });

export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.categoryRepository.findById(tenantId, id), 'Category not found');
  }

  list(tenantId: string, filters?: Parameters<CategoryRepository['list']>[1]) {
    return this.categoryRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createCategorySchema, input);
    const existing = await this.categoryRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Category code already exists');
    }

    if (data.parentId) {
      const parentId = data.parentId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCategory(tenantId, parentId),
        'Parent category not found in tenant',
      );
    }

    const category = await this.categoryRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'category',
      entityId: category.id,
      newValues: category,
      context,
    });

    return category;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.categoryRepository.findById(tenantId, id),
      'Category not found',
    );
    const data = parseInput(updateCategorySchema, input);

    if (data.parentId) {
      const parentId = data.parentId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCategory(tenantId, parentId),
        'Parent category not found in tenant',
      );
    }

    const category = await assertFound(
      this.categoryRepository.update(tenantId, id, {
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        ...(data.parentId !== undefined
          ? data.parentId
            ? { parent: { connect: { id: data.parentId } } }
            : { parent: { disconnect: true } }
          : {}),
      }),
      'Category not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'category',
      entityId: id,
      oldValues: existing,
      newValues: category,
      context,
    });

    return category;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.categoryRepository.findById(tenantId, id),
      'Category not found',
    );
    await this.categoryRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'category',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
