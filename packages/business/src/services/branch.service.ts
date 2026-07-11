import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { OrganizationRepository } from '../repositories/organization.repository.js';
import type { ManagerValidationService } from './manager-validation.service.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, assertTenantRef, asJson, asJsonOptional, parseInput } from './validation.js';

const createBranchSchema = z.object({
  organizationId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: z.enum(['SHOWROOM', 'WORKSHOP', 'WAREHOUSE', 'VAULT', 'OFFICE', 'HEADQUARTERS']).optional(),
  branchStatus: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
  isHeadOffice: z.boolean().optional(),
  timezone: z.string().max(50).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  defaultCurrencyCode: z.string().length(3).optional().nullable(),
  defaultWarehouseBranchId: z.string().uuid().optional().nullable(),
  workingHours: z.record(z.unknown()).optional(),
  taxConfiguration: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateBranchSchema = createBranchSchema.partial().omit({ organizationId: true });

const branchCurrencySchema = z.object({
  currencyCode: z.string().length(3),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const branchSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export class BranchService {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly managerValidationService: ManagerValidationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.branchRepository.findById(tenantId, id), 'Branch not found');
  }

  list(tenantId: string, filters?: Parameters<BranchRepository['list']>[1]) {
    return this.branchRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createBranchSchema, input);
    const existing = await this.branchRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Branch code already exists');
    }

    await assertTenantRef(
      () => this.organizationRepository.findById(tenantId, data.organizationId),
      'Organization not found in tenant',
    );

    if (data.managerId) {
      await this.managerValidationService.validateBranchManagerAssignment(
        tenantId,
        null,
        data.managerId,
      );
    }

    const branch = await this.branchRepository.create(tenantId, {
      organization: { connect: { id: data.organizationId } },
      code: data.code,
      name: data.name,
      type: data.type,
      branchStatus: data.branchStatus,
      phone: data.phone ?? null,
      email: data.email ?? null,
      isActive: data.isActive,
      isHeadOffice: data.isHeadOffice,
      timezone: data.timezone ?? null,
      ...(data.managerId ? { manager: { connect: { id: data.managerId } } } : {}),
      defaultCurrencyCode: data.defaultCurrencyCode ?? null,
      ...(data.defaultWarehouseBranchId
        ? { defaultWarehouseBranch: { connect: { id: data.defaultWarehouseBranchId } } }
        : {}),
      workingHours: asJsonOptional(data.workingHours) ?? {},
      taxConfiguration: asJsonOptional(data.taxConfiguration) ?? {},
      metadata: asJsonOptional(data.metadata) ?? {},
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'branch',
      entityId: branch.id,
      newValues: branch,
      context,
    });

    return branch;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.branchRepository.findById(tenantId, id),
      'Branch not found',
    );
    const data = parseInput(updateBranchSchema, input);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.branchRepository.findByCode(tenantId, data.code);
      if (duplicate) {
        throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Branch code already exists');
      }
    }

    if (data.managerId) {
      await this.managerValidationService.validateBranchManagerAssignment(
        tenantId,
        id,
        data.managerId,
      );
    }

    const branch = await assertFound(
      this.branchRepository.update(tenantId, id, {
        code: data.code,
        name: data.name,
        type: data.type,
        branchStatus: data.branchStatus,
        phone: data.phone,
        email: data.email,
        isActive: data.isActive,
        isHeadOffice: data.isHeadOffice,
        timezone: data.timezone,
        defaultCurrencyCode: data.defaultCurrencyCode,
        workingHours: asJsonOptional(data.workingHours),
        taxConfiguration: asJsonOptional(data.taxConfiguration),
        metadata: asJsonOptional(data.metadata),
        ...(data.managerId !== undefined
          ? data.managerId
            ? { manager: { connect: { id: data.managerId } } }
            : { manager: { disconnect: true } }
          : {}),
        ...(data.defaultWarehouseBranchId !== undefined
          ? data.defaultWarehouseBranchId
            ? { defaultWarehouseBranch: { connect: { id: data.defaultWarehouseBranchId } } }
            : { defaultWarehouseBranch: { disconnect: true } }
          : {}),
      }),
      'Branch not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'branch',
      entityId: id,
      oldValues: existing,
      newValues: branch,
      context,
    });

    return branch;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.branchRepository.findById(tenantId, id),
      'Branch not found',
    );
    await this.branchRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'branch',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  listCurrencies(tenantId: string, branchId: string) {
    return this.branchRepository.listCurrencies(tenantId, branchId);
  }

  async addCurrency(tenantId: string, branchId: string, input: unknown, context?: AuditContext) {
    await assertFound(this.branchRepository.findById(tenantId, branchId), 'Branch not found');
    const data = parseInput(branchCurrencySchema, input);
    const currency = await this.branchRepository.addCurrency(tenantId, {
      branchId,
      ...data,
    });
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'branch_currency',
      entityId: currency.id,
      newValues: currency,
      context,
    });
    return currency;
  }

  listSettings(tenantId: string, branchId: string) {
    return this.branchRepository.listSettings(tenantId, branchId);
  }

  async upsertSetting(tenantId: string, branchId: string, input: unknown, context?: AuditContext) {
    await assertFound(this.branchRepository.findById(tenantId, branchId), 'Branch not found');
    const data = parseInput(branchSettingSchema, input);
    const setting = await assertFound(
      this.branchRepository.upsertSetting(tenantId, branchId, data.key, asJson(data.value)),
      'Branch setting not found',
    );
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'branch_setting',
      entityId: setting.id,
      newValues: setting,
      context,
    });
    return setting;
  }
}
