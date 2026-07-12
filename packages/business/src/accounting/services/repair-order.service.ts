import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { RepairOrderRepository } from '../repositories/operations.repository.js';
import type { OperationsAccountingIntegrationService } from './operations-integration.service.js';

const completeSchema = z.object({
  revenueAmount: z.number().positive(),
  laborCost: z.number().min(0).default(0),
  partsCost: z.number().min(0).default(0),
  actualCost: z.number().min(0).optional(),
});

export class RepairOrderService {
  constructor(
    private readonly repository: RepairOrderRepository,
    private readonly auditService: AuditService,
    private readonly operationsAccountingIntegrationService?: OperationsAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.repository.findById(tenantId, id), 'Repair order not found');
  }

  async complete(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(completeSchema, input);
    const order = await assertFound(
      this.repository.findById(tenantId, id),
      'Repair order not found',
    );

    if (!['IN_PROGRESS', 'AWAITING_PARTS', 'DIAGNOSING', 'RECEIVED'].includes(order.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Repair order cannot be completed');
    }

    const updated = await this.repository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      actualCost: data.actualCost ?? (data.laborCost ?? 0) + (data.partsCost ?? 0),
    });

    if (this.operationsAccountingIntegrationService) {
      await this.operationsAccountingIntegrationService.postRepairCompletion(
        tenantId,
        {
          orderId: order.id,
          branchId: order.branchId,
          revenueAmount: data.revenueAmount,
          laborCost: data.laborCost ?? 0,
          partsCost: data.partsCost ?? 0,
          entryDate: new Date(),
        },
        context,
      );
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'repair_order',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }
}
