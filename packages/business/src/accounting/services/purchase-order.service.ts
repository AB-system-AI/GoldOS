import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { DocumentNumberGenerator } from '../../sales/engines/document-number.generator.js';
import type { PurchaseAccountingIntegrationService } from './integration.service.js';
import type { PurchaseOrderRepository } from '../repositories/purchase-order.repository.js';

const completeSchema = z.object({
  receivedById: z.string().uuid().optional().nullable(),
});

export class PurchaseOrderService {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly auditService: AuditService,
    private readonly purchaseAccountingIntegrationService?: PurchaseAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );
  }

  list(tenantId: string, filters?: Parameters<PurchaseOrderRepository['list']>[1]) {
    return this.purchaseOrderRepository.list(tenantId, filters);
  }

  async complete(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(completeSchema, input);
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );

    if (!['APPROVED', 'PARTIALLY_RECEIVED', 'SUBMITTED'].includes(order.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Purchase order cannot be completed');
    }

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasSupplier(tenantId, order.supplierId),
      'Supplier not found in tenant',
    );

    const updated = await this.purchaseOrderRepository.update(tenantId, id, {
      status: 'RECEIVED',
    });

    if (this.purchaseAccountingIntegrationService) {
      await this.purchaseAccountingIntegrationService.postPurchaseOrder(
        tenantId,
        {
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          branchId: order.branchId,
          totalAmount: Number(order.totalAmount),
          entryDate: new Date(),
        },
        context,
      );
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_order',
      entityId: id,
      newValues: { action: 'complete', receivedById: data.receivedById },
      context,
    });

    return updated;
  }

  async recordSupplierPayment(tenantId: string, input: unknown, context?: AuditContext) {
    const schema = z.object({
      supplierId: z.string().uuid(),
      branchId: z.string().uuid().optional().nullable(),
      amount: z.number().positive(),
      reference: z.string().optional().nullable(),
    });
    const data = parseInput(schema, input);
    const paymentId = `sp-${Date.now().toString(36)}`;

    if (this.purchaseAccountingIntegrationService) {
      await this.purchaseAccountingIntegrationService.postSupplierPayment(
        tenantId,
        {
          paymentId,
          supplierId: data.supplierId,
          branchId: data.branchId,
          amount: data.amount,
          entryDate: new Date(),
        },
        context,
      );
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'supplier_payment',
      entityId: paymentId,
      newValues: data,
      context,
    });

    return { paymentId, ...data };
  }
}
