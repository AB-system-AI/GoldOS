import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { LoyaltyRepository } from '../repositories/loyalty.repository.js';

const adjustSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number(),
  reason: z.string().min(1),
});

const redeemSchema = z.object({
  customerId: z.string().uuid(),
  points: z.number().positive(),
  referenceType: z.string().optional(),
  referenceId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

const ruleSchema = z.object({
  pointsPerCurrency: z.number().positive().default(1),
  vipMultiplier: z.number().positive().default(1.5),
  platinumMultiplier: z.number().positive().default(2),
  expirationDays: z.number().int().positive().default(365),
  redeemRate: z.number().positive().default(0.01),
  isActive: z.boolean().default(true),
});

const DEFAULT_RULE = {
  pointsPerCurrency: 1,
  vipMultiplier: 1.5,
  platinumMultiplier: 2,
  expirationDays: 365,
  redeemRate: 0.01,
};

export class LoyaltyService {
  constructor(
    private readonly loyaltyRepository: LoyaltyRepository,
    private readonly auditService: AuditService,
  ) {}

  async getAccount(tenantId: string, customerId: string) {
    await this.loyaltyRepository.ensureAccount(tenantId, customerId);
    return assertFound(
      this.loyaltyRepository.findByCustomer(tenantId, customerId),
      'Loyalty account not found',
    );
  }

  async getProgramRule(tenantId: string) {
    const rule = await this.loyaltyRepository.getProgramRule(tenantId);
    return rule ?? { ...DEFAULT_RULE, tenantId, id: '', isActive: true };
  }

  async upsertProgramRule(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(ruleSchema, input);
    const rule = await this.loyaltyRepository.upsertProgramRule(tenantId, data);
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'loyalty_program_rule',
      entityId: rule.id,
      newValues: rule,
      context,
    });
    return rule;
  }

  private async resolveMultiplier(tenantId: string, tier?: string | null) {
    const rule = await this.getProgramRule(tenantId);
    if (tier === 'PLATINUM') return Number(rule.platinumMultiplier);
    if (tier === 'VIP') return Number(rule.vipMultiplier);
    return 1;
  }

  async earnOnSale(
    tenantId: string,
    customerId: string,
    saleAmount: number,
    reference: { type: string; id: string },
    context?: AuditContext,
  ) {
    const account = await this.getAccount(tenantId, customerId);
    const rule = await this.getProgramRule(tenantId);
    if (!rule.isActive) return null;

    const multiplier = await this.resolveMultiplier(tenantId, account.tier);
    const points = Math.floor(saleAmount * Number(rule.pointsPerCurrency) * multiplier);
    if (points <= 0) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + rule.expirationDays);

    const tx = await this.loyaltyRepository.adjustPoints(
      tenantId,
      account.id,
      points,
      'EARN',
      reference,
      'Points earned on sale',
      { expiresAt, multiplier },
    );

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'loyalty_transaction',
      entityId: tx?.id ?? '',
      newValues: { type: 'EARN', points, reference },
      context,
    });

    return tx;
  }

  async redeem(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(redeemSchema, input);
    const account = await this.getAccount(tenantId, data.customerId);
    const balance = Number(account.pointsBalance);

    if (balance < data.points) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Insufficient loyalty points');
    }

    const tx = await this.loyaltyRepository.adjustPoints(
      tenantId,
      account.id,
      -data.points,
      'REDEEM',
      data.referenceId ? { type: data.referenceType ?? 'sale', id: data.referenceId } : undefined,
      data.reason ?? 'Points redeemed',
    );

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'loyalty_transaction',
      entityId: tx?.id ?? '',
      newValues: { type: 'REDEEM', points: -data.points },
      context,
    });

    return tx;
  }

  async reverse(
    tenantId: string,
    customerId: string,
    points: number,
    reference: { type: string; id: string },
    reason: string,
    context?: AuditContext,
  ) {
    const account = await this.getAccount(tenantId, customerId);
    const tx = await this.loyaltyRepository.adjustPoints(
      tenantId,
      account.id,
      -Math.abs(points),
      'REVERSE',
      reference,
      reason,
    );

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'loyalty_transaction',
      entityId: tx?.id ?? '',
      newValues: { type: 'REVERSE', points: -Math.abs(points), reference },
      context,
    });

    return tx;
  }

  async manualAdjust(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(adjustSchema, input);
    const account = await this.getAccount(tenantId, data.customerId);

    const tx = await this.loyaltyRepository.adjustPoints(
      tenantId,
      account.id,
      data.points,
      'ADJUSTMENT',
      undefined,
      data.reason,
    );

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'loyalty_transaction',
      entityId: tx?.id ?? '',
      newValues: { type: 'ADJUSTMENT', points: data.points, reason: data.reason },
      context,
    });

    return tx;
  }

  getRedeemValue(tenantId: string, points: number) {
    return this.getProgramRule(tenantId).then((rule) => points * Number(rule.redeemRate));
  }

  listHistory(tenantId: string, customerId: string) {
    return this.getAccount(tenantId, customerId).then((account) =>
      this.loyaltyRepository.listTransactions(tenantId, account.id),
    );
  }
}
