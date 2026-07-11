import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { CollectionRepository } from '../repositories/collection.repository.js';

const createCollectionSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  season: z.string().max(50).optional().nullable(),
  year: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateCollectionSchema = createCollectionSchema.partial().omit({ code: true });

export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.collectionRepository.findById(tenantId, id), 'Collection not found');
  }

  list(tenantId: string, filters?: Parameters<CollectionRepository['list']>[1]) {
    return this.collectionRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createCollectionSchema, input);
    const existing = await this.collectionRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Collection code already exists');
    }

    const collection = await this.collectionRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      season: data.season ?? null,
      year: data.year ?? null,
      isActive: data.isActive,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'collection',
      entityId: collection.id,
      newValues: collection,
      context,
    });

    return collection;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.collectionRepository.findById(tenantId, id),
      'Collection not found',
    );
    const data = parseInput(updateCollectionSchema, input);

    const collection = await assertFound(
      this.collectionRepository.update(tenantId, id, {
        name: data.name,
        description: data.description,
        season: data.season,
        year: data.year,
        isActive: data.isActive,
      }),
      'Collection not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'collection',
      entityId: id,
      oldValues: existing,
      newValues: collection,
      context,
    });

    return collection;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.collectionRepository.findById(tenantId, id),
      'Collection not found',
    );
    await this.collectionRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'collection',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
