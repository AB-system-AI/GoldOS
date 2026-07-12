import type { CashMovementType } from '@goldos/database';

import type { AuditContext } from '../../services/audit.service.js';
import {
  buildBankTransactionRule,
  buildCashMovementRule,
  buildGoldRevaluationRule,
  buildInventoryAdjustmentRule,
  buildManufacturingCompletionRule,
  buildRepairCompletionRule,
} from '../engines/accounting-rule.engine.js';
import type { GoldCostRepository } from '../repositories/expense.repository.js';
import type { AccountingPostingService } from './accounting-posting.service.js';

export class OperationsAccountingIntegrationService {
  constructor(
    private readonly postingService: AccountingPostingService,
    private readonly goldCostRepository: GoldCostRepository,
  ) {}

  async postInventoryAdjustment(
    tenantId: string,
    params: {
      adjustmentId: string;
      branchId: string;
      amount: number;
      isIncrease: boolean;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildInventoryAdjustmentRule({
      amount: params.amount,
      isIncrease: params.isIncrease,
    });

    return this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'INVENTORY_ADJUSTMENT',
        referenceId: params.adjustmentId,
        rule,
      },
      context,
    );
  }

  async postGoldRevaluation(
    tenantId: string,
    params: {
      referenceId: string;
      branchId?: string | null;
      adjustmentAmount: number;
      isIncrease: boolean;
      entryDate: Date;
      goldCost?: {
        inventoryItemId?: string | null;
        weightGrams: number;
        karat: string;
        purchaseCost: number;
      };
    },
    context?: AuditContext,
  ) {
    const rule = buildGoldRevaluationRule({
      adjustmentAmount: params.adjustmentAmount,
      isIncrease: params.isIncrease,
    });

    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'GOLD_PRICE_ADJUSTMENT',
        referenceId: params.referenceId,
        rule,
      },
      context,
    );

    if (params.goldCost) {
      await this.goldCostRepository.create(tenantId, {
        referenceType: 'gold_revaluation',
        referenceId: params.referenceId,
        weightGrams: params.goldCost.weightGrams,
        karat: params.goldCost.karat as never,
        purchaseCost: params.goldCost.purchaseCost,
        makingCost: 0,
        stoneCost: 0,
        laborCost: 0,
        totalCost: params.goldCost.purchaseCost,
        ...(params.goldCost.inventoryItemId
          ? { inventoryItem: { connect: { id: params.goldCost.inventoryItemId } } }
          : {}),
      });
    }

    return journal;
  }

  async postCashMovement(
    tenantId: string,
    params: {
      movementId: string;
      branchId: string;
      amount: number;
      movementType: CashMovementType;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const mapped =
      params.movementType === 'SHORTAGE'
        ? 'SHORTAGE'
        : params.movementType === 'OVERAGE'
          ? 'OVERAGE'
          : params.movementType === 'DEPOSIT'
            ? 'DEPOSIT'
            : params.movementType === 'WITHDRAWAL'
              ? 'WITHDRAWAL'
              : 'TRANSFER';

    const rule = buildCashMovementRule({
      amount: params.amount,
      movementType: mapped,
    });

    return this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'CASH_MOVEMENT',
        referenceId: params.movementId,
        rule,
      },
      context,
    );
  }

  async postBankTransaction(
    tenantId: string,
    params: {
      transactionId: string;
      amount: number;
      transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildBankTransactionRule({
      amount: params.amount,
      transactionType: params.transactionType,
    });

    return this.postingService.postFromRule(
      tenantId,
      {
        entryDate: params.entryDate,
        referenceType: 'BANK_TRANSACTION',
        referenceId: params.transactionId,
        rule,
      },
      context,
    );
  }

  async postManufacturingCompletion(
    tenantId: string,
    params: {
      orderId: string;
      branchId: string;
      wipAmount: number;
      finishedGoodsAmount: number;
      entryDate: Date;
      goldCost?: {
        weightGrams: number;
        karat: string;
        purchaseCost: number;
        makingCost?: number;
        laborCost?: number;
      };
    },
    context?: AuditContext,
  ) {
    const rule = buildManufacturingCompletionRule({
      wipAmount: params.wipAmount,
      finishedGoodsAmount: params.finishedGoodsAmount,
    });

    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'MANUFACTURING_ORDER',
        referenceId: params.orderId,
        rule,
      },
      context,
    );

    if (params.goldCost) {
      const makingCost = params.goldCost.makingCost ?? 0;
      const laborCost = params.goldCost.laborCost ?? 0;
      await this.goldCostRepository.create(tenantId, {
        referenceType: 'manufacturing',
        referenceId: params.orderId,
        weightGrams: params.goldCost.weightGrams,
        karat: params.goldCost.karat as never,
        purchaseCost: params.goldCost.purchaseCost,
        makingCost,
        laborCost,
        stoneCost: 0,
        totalCost: params.goldCost.purchaseCost + makingCost + laborCost,
      });
    }

    return journal;
  }

  async postRepairCompletion(
    tenantId: string,
    params: {
      orderId: string;
      branchId: string;
      revenueAmount: number;
      laborCost: number;
      partsCost: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildRepairCompletionRule({
      revenueAmount: params.revenueAmount,
      laborCost: params.laborCost,
      partsCost: params.partsCost,
    });

    return this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'REPAIR_ORDER',
        referenceId: params.orderId,
        rule,
      },
      context,
    );
  }
}
