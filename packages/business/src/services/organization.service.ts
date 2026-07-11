import { z } from 'zod';

import type { AuditContext } from './audit.service.js';
import type { AuditService } from './audit.service.js';
import type { OrganizationRepository } from '../repositories/organization.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, asJsonOptional, parseInput } from './validation.js';

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  legalName: z.string().max(255).optional().nullable(),
  code: z.string().min(1).max(50),
  taxId: z.string().max(50).optional().nullable(),
  commercialRegNo: z.string().max(50).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  defaultCurrency: z.string().length(3).default('SAR'),
  logoFileId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.organizationRepository.findById(tenantId, id),
      'Organization not found',
    );
  }

  list(tenantId: string, filters?: Parameters<OrganizationRepository['list']>[1]) {
    return this.organizationRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createOrganizationSchema, input);
    const existing = await this.organizationRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.ALREADY_EXISTS,
        'Organization code already exists',
      );
    }

    const organization = await this.organizationRepository.create(tenantId, {
      name: data.name,
      legalName: data.legalName ?? null,
      code: data.code,
      taxId: data.taxId ?? null,
      commercialRegNo: data.commercialRegNo ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      website: data.website ?? null,
      defaultCurrency: data.defaultCurrency,
      ...(data.logoFileId ? { logoFile: { connect: { id: data.logoFileId } } } : {}),
      metadata: asJsonOptional(data.metadata) ?? {},
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'organization',
      entityId: organization.id,
      newValues: organization,
      context,
    });

    return organization;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.organizationRepository.findById(tenantId, id),
      'Organization not found',
    );
    const data = parseInput(updateOrganizationSchema, input);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.organizationRepository.findByCode(tenantId, data.code);
      if (duplicate) {
        throw new BusinessError(
          BusinessErrorCodes.ALREADY_EXISTS,
          'Organization code already exists',
        );
      }
    }

    const organization = await this.organizationRepository.update(tenantId, id, {
      name: data.name,
      legalName: data.legalName,
      code: data.code,
      taxId: data.taxId,
      commercialRegNo: data.commercialRegNo,
      email: data.email,
      phone: data.phone,
      website: data.website,
      defaultCurrency: data.defaultCurrency,
      metadata: asJsonOptional(data.metadata),
      ...(data.logoFileId !== undefined
        ? data.logoFileId
          ? { logoFile: { connect: { id: data.logoFileId } } }
          : { logoFile: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'organization',
      entityId: id,
      oldValues: existing,
      newValues: organization,
      context,
    });

    return organization;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.organizationRepository.findById(tenantId, id),
      'Organization not found',
    );
    await this.organizationRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'organization',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
