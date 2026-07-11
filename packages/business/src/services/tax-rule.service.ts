import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { TaxRuleRepository } from '../repositories/tax-rule.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, asJsonOptional, parseInput } from './validation.js';

const createTaxRuleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  type: z.enum(['VAT', 'SALES_TAX', 'WITHHOLDING', 'EXEMPT', 'CUSTOM']),
  rate: z.union([z.number().min(0), z.string()]),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTaxRuleSchema = createTaxRuleSchema.partial();

export class TaxRuleService {
  constructor(
    private readonly taxRuleRepository: TaxRuleRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.taxRuleRepository.findById(tenantId, id), 'Tax rule not found');
  }

  getDefault(tenantId: string) {
    return this.taxRuleRepository.findDefault(tenantId);
  }

  list(tenantId: string, filters?: Parameters<TaxRuleRepository['list']>[1]) {
    return this.taxRuleRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createTaxRuleSchema, input);
    const existing = await this.taxRuleRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Tax rule code already exists');
    }

    if (data.isDefault) {
      await this.taxRuleRepository.clearDefault(tenantId);
    }

    const rule = await this.taxRuleRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      type: data.type,
      rate: data.rate,
      isDefault: data.isDefault,
      isActive: data.isActive,
      metadata: asJsonOptional(data.metadata) ?? {},
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'tax_rule',
      entityId: rule.id,
      newValues: rule,
      context,
    });

    return rule;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.taxRuleRepository.findById(tenantId, id),
      'Tax rule not found',
    );
    const data = parseInput(updateTaxRuleSchema, input);

    if (data.isDefault) {
      await this.taxRuleRepository.clearDefault(tenantId, id);
    }

    const rule = await this.taxRuleRepository.update(tenantId, id, {
      code: data.code,
      name: data.name,
      type: data.type,
      rate: data.rate,
      isDefault: data.isDefault,
      isActive: data.isActive,
      metadata: asJsonOptional(data.metadata),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'tax_rule',
      entityId: id,
      oldValues: existing,
      newValues: rule,
      context,
    });

    return rule;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.taxRuleRepository.findById(tenantId, id),
      'Tax rule not found',
    );
    await this.taxRuleRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'tax_rule',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
