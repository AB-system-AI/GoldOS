import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { PricingRuleRepository } from '../repositories/pricing-rule.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, asJsonOptional, parseInput } from './validation.js';

const createPricingRuleSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  type: z.enum(['GOLD_RATE', 'MAKING_CHARGE', 'DISCOUNT', 'MARKUP', 'BUNDLE', 'CUSTOM']),
  conditions: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  priority: z.number().int().optional(),
  isActive: z.boolean().optional(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
});

const updatePricingRuleSchema = createPricingRuleSchema.partial();

export class PricingRuleService {
  constructor(
    private readonly pricingRuleRepository: PricingRuleRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.pricingRuleRepository.findById(tenantId, id), 'Pricing rule not found');
  }

  list(tenantId: string, filters?: Parameters<PricingRuleRepository['list']>[1]) {
    return this.pricingRuleRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createPricingRuleSchema, input);
    const existing = await this.pricingRuleRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.ALREADY_EXISTS,
        'Pricing rule code already exists',
      );
    }

    const rule = await this.pricingRuleRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      type: data.type,
      conditions: asJsonOptional(data.conditions) ?? {},
      actions: asJsonOptional(data.actions) ?? {},
      priority: data.priority,
      isActive: data.isActive,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'pricing_rule',
      entityId: rule.id,
      newValues: rule,
      context,
    });

    return rule;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.pricingRuleRepository.findById(tenantId, id),
      'Pricing rule not found',
    );
    const data = parseInput(updatePricingRuleSchema, input);
    const rule = await this.pricingRuleRepository.update(tenantId, id, {
      code: data.code,
      name: data.name,
      type: data.type,
      conditions: asJsonOptional(data.conditions),
      actions: asJsonOptional(data.actions),
      priority: data.priority,
      isActive: data.isActive,
      validFrom: data.validFrom,
      validTo: data.validTo,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'pricing_rule',
      entityId: id,
      oldValues: existing,
      newValues: rule,
      context,
    });

    return rule;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.pricingRuleRepository.findById(tenantId, id),
      'Pricing rule not found',
    );
    await this.pricingRuleRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'pricing_rule',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
