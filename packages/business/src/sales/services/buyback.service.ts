import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, asJson, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { GoldPriceEngineService } from '../../engines/gold-price/gold-price.service.js';
import type { MovementEngine } from '../../inventory/engines/movement.engine.js';
import { evaluateBuyback, findGoldRate } from '../engines/buyback.engine.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { BuybackRepository } from '../repositories/buyback.repository.js';
import type { SalesNotificationService } from './sales-notification.service.js';
import type { SalesAccountingIntegrationService } from '../../accounting/services/integration.service.js';

const createBuybackSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']),
  weightGrams: z.number().positive(),
  purity: z.number().positive().max(1).optional().nullable(),
  offeredAmount: z.number().positive().optional(),
  currency: z.string().length(3).default('SAR'),
  notes: z.string().optional().nullable(),
});

const approveBuybackSchema = z.object({
  approvedById: z.string().uuid(),
  approvedAmount: z.number().positive().optional(),
});

export class BuybackService {
  constructor(
    private readonly buybackRepository: BuybackRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly goldPriceService: GoldPriceEngineService,
    private readonly movementEngine: MovementEngine,
    private readonly auditService: AuditService,
    private readonly salesNotificationService?: SalesNotificationService,
    private readonly salesAccountingIntegrationService?: SalesAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.buybackRepository.findById(tenantId, id), 'Buyback not found');
  }

  list(tenantId: string, filters?: Parameters<BuybackRepository['list']>[1]) {
    return this.buybackRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createBuybackSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasCustomer(tenantId, data.customerId),
      'Customer not found in tenant',
    );

    const goldRates = await this.goldPriceService.getBranchPricing(
      tenantId,
      data.branchId,
      data.currency,
    );
    const pricePerGram = findGoldRate(goldRates.quotes, data.karat);
    if (!pricePerGram) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Gold rate not available for karat',
      );
    }

    const evaluation = evaluateBuyback({
      karat: data.karat,
      weightGrams: data.weightGrams,
      purity: data.purity,
      pricePerGram,
      offeredAmount: data.offeredAmount,
    });

    const requiresApproval =
      data.offeredAmount !== undefined && data.offeredAmount > evaluation.marketValue * 1.05;

    const transactionNo = await this.documentNumberGenerator.next(tenantId, 'BUYBACK', {
      branchId: data.branchId,
    });

    const buyback = await this.buybackRepository.create(tenantId, {
      transactionNo,
      status: requiresApproval ? 'PENDING_APPROVAL' : 'DRAFT',
      karat: data.karat,
      weightGrams: data.weightGrams,
      purity: data.purity ?? null,
      goldRateSnapshot: asJson(goldRates),
      offeredAmount: evaluation.offeredAmount,
      currency: data.currency,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      customer: { connect: { id: data.customerId } },
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'buyback',
      entityId: buyback.id,
      newValues: buyback,
      context,
    });

    return this.getById(tenantId, buyback.id);
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(approveBuybackSchema, input);
    const existing = await assertFound(
      this.buybackRepository.findById(tenantId, id),
      'Buyback not found',
    );
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existing.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Buyback cannot be approved');
    }

    const updated = await this.buybackRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedAmount: data.approvedAmount ?? existing.offeredAmount,
      approvedAt: new Date(),
      approver: { connect: { id: data.approvedById } },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'buyback',
      entityId: id,
      newValues: { action: 'approve' },
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const buyback = await assertFound(
      this.buybackRepository.findById(tenantId, id),
      'Buyback not found',
    );
    if (buyback.status !== 'APPROVED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Buyback must be approved before completion',
      );
    }

    if (buyback.inventoryItemId) {
      await this.movementEngine.record({
        tenantId,
        branchId: buyback.branchId,
        inventoryItemId: buyback.inventoryItemId,
        type: 'BUYBACK',
        referenceType: 'buyback',
        referenceId: buyback.id,
        performedById: context?.userId ?? buyback.employeeId,
        reason: `Buyback ${buyback.transactionNo}`,
        auditContext: context,
      });
    }

    const updated = await this.buybackRepository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    const amount = Number(buyback.approvedAmount ?? buyback.offeredAmount);
    if (this.salesAccountingIntegrationService) {
      await this.salesAccountingIntegrationService.postBuyback(
        tenantId,
        {
          buybackId: buyback.id,
          branchId: buyback.branchId,
          customerId: buyback.customerId,
          amount,
          entryDate: new Date(),
          goldCost: {
            inventoryItemId: buyback.inventoryItemId,
            weightGrams: Number(buyback.weightGrams),
            karat: buyback.karat,
            purity: buyback.purity ? Number(buyback.purity) : null,
            purchaseCost: amount,
          },
        },
        context,
      );
    }

    await this.salesNotificationService?.emit({
      tenantId,
      branchId: buyback.branchId,
      eventType: 'BUYBACK_COMPLETED',
      referenceType: 'buyback',
      referenceId: id,
      title: 'Buyback completed',
      body: `Buyback ${buyback.transactionNo} completed`,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'buyback',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }
}
