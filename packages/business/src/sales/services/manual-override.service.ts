import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertTenantRef, parseInput } from '../../services/validation.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { ManualOverrideRepository } from '../repositories/manual-override.repository.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  referenceType: z.string().min(1),
  referenceId: z.string().uuid(),
  overrideType: z.enum([
    'SELLING_PRICE',
    'BUYBACK_PRICE',
    'DISCOUNT',
    'MAKING_CHARGE',
    'LABOR_CHARGE',
  ]),
  fieldName: z.string().min(1),
  originalValue: z.number(),
  overrideValue: z.number(),
  reason: z.string().min(3),
  createdById: z.string().uuid(),
});

export class ManualOverrideService {
  constructor(
    private readonly manualOverrideRepository: ManualOverrideRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  list(tenantId: string, filters?: Parameters<ManualOverrideRepository['list']>[1]) {
    return this.manualOverrideRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const override = await this.manualOverrideRepository.create(tenantId, {
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      overrideType: data.overrideType,
      fieldName: data.fieldName,
      originalValue: data.originalValue,
      overrideValue: data.overrideValue,
      reason: data.reason,
      branch: { connect: { id: data.branchId } },
      createdBy: { connect: { id: data.createdById } },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'manual_price_override',
      entityId: override.id,
      newValues: override,
      context,
    });

    return override;
  }
}
