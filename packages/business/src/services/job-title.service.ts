import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { JobTitleRepository } from '../repositories/job-title.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, parseInput } from './validation.js';

const createJobTitleSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  level: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateJobTitleSchema = createJobTitleSchema.partial();

export class JobTitleService {
  constructor(
    private readonly jobTitleRepository: JobTitleRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.jobTitleRepository.findById(tenantId, id), 'Job title not found');
  }

  list(tenantId: string, filters?: Parameters<JobTitleRepository['list']>[1]) {
    return this.jobTitleRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createJobTitleSchema, input);
    const existing = await this.jobTitleRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Job title code already exists');
    }

    const jobTitle = await this.jobTitleRepository.create(tenantId, data);

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'job_title',
      entityId: jobTitle.id,
      newValues: jobTitle,
      context,
    });

    return jobTitle;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.jobTitleRepository.findById(tenantId, id),
      'Job title not found',
    );
    const data = parseInput(updateJobTitleSchema, input);
    const jobTitle = await this.jobTitleRepository.update(tenantId, id, data);

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'job_title',
      entityId: id,
      oldValues: existing,
      newValues: jobTitle,
      context,
    });

    return jobTitle;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.jobTitleRepository.findById(tenantId, id),
      'Job title not found',
    );
    await this.jobTitleRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'job_title',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
