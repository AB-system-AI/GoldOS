import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { ManufacturingOrderRepository } from '../repositories/operations.repository.js';
import type { OperationsAccountingIntegrationService } from './operations-integration.service.js';

const completeSchema = z.object({
  wipAmount: z.number().min(0),
  finishedGoodsAmount: z.number().positive(),
  weightGrams: z.number().positive().optional(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional(),
  purchaseCost: z.number().min(0).optional(),
  makingCost: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
});

export class ManufacturingOrderService {
  constructor(
    private readonly repository: ManufacturingOrderRepository,
    private readonly auditService: AuditService,
    private readonly operationsAccountingIntegrationService?: OperationsAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.repository.findById(tenantId, id), 'Manufacturing order not found');
  }

  async complete(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(completeSchema, input);
    const order = await assertFound(
      this.repository.findById(tenantId, id),
      'Manufacturing order not found',
    );

    if (!['IN_PROGRESS', 'QUALITY_CHECK', 'SCHEDULED'].includes(order.status)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Manufacturing order cannot be completed',
      );
    }

    const updated = await this.repository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    if (this.operationsAccountingIntegrationService) {
      await this.operationsAccountingIntegrationService.postManufacturingCompletion(
        tenantId,
        {
          orderId: order.id,
          branchId: order.branchId,
          wipAmount: data.finishedGoodsAmount,
          finishedGoodsAmount: data.finishedGoodsAmount,
          entryDate: new Date(),
          ...(data.weightGrams && data.karat
            ? {
                goldCost: {
                  weightGrams: data.weightGrams,
                  karat: data.karat,
                  purchaseCost: data.purchaseCost ?? data.finishedGoodsAmount,
                  makingCost: data.makingCost,
                  laborCost: data.laborCost,
                },
              }
            : {}),
        },
        context,
      );
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'manufacturing_order',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }
}
