import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { BrandRepository } from '../repositories/brand.repository.js';

const createBrandSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  logoFileId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateBrandSchema = createBrandSchema.partial().omit({ code: true });

export class BrandService {
  constructor(
    private readonly brandRepository: BrandRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.brandRepository.findById(tenantId, id), 'Brand not found');
  }

  list(tenantId: string, filters?: Parameters<BrandRepository['list']>[1]) {
    return this.brandRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createBrandSchema, input);
    const existing = await this.brandRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Brand code already exists');
    }

    const brand = await this.brandRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      isActive: data.isActive,
      ...(data.logoFileId ? { logoFile: { connect: { id: data.logoFileId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'brand',
      entityId: brand.id,
      newValues: brand,
      context,
    });

    return brand;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.brandRepository.findById(tenantId, id),
      'Brand not found',
    );
    const data = parseInput(updateBrandSchema, input);

    const brand = await assertFound(
      this.brandRepository.update(tenantId, id, {
        name: data.name,
        isActive: data.isActive,
        ...(data.logoFileId !== undefined
          ? data.logoFileId
            ? { logoFile: { connect: { id: data.logoFileId } } }
            : { logoFile: { disconnect: true } }
          : {}),
      }),
      'Brand not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'brand',
      entityId: id,
      oldValues: existing,
      newValues: brand,
      context,
    });

    return brand;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.brandRepository.findById(tenantId, id),
      'Brand not found',
    );
    await this.brandRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'brand',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
