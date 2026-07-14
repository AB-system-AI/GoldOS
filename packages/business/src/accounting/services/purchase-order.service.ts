import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { PurchasingDocumentNumberGenerator } from '../../purchasing/engines/document-number.generator.js';
import { calculatePurchaseTotals } from '../../purchasing/engines/purchase-calculation.engine.js';
import { PurchaseStatusEngine } from '../../purchasing/engines/purchase-status.engine.js';
import type { PurchaseApprovalService } from '../../purchasing/services/purchase-approval.service.js';
import type { PurchaseAccountingIntegrationService } from './integration.service.js';
import type { PurchaseOrderRepository } from '../repositories/purchase-order.repository.js';

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0),
  notes: z.string().optional().nullable(),
});

const createSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseRequestId: z.string().uuid().optional().nullable(),
  purchaseRfqId: z.string().uuid().optional().nullable(),
  supplierQuotationId: z.string().uuid().optional().nullable(),
  warehouseZoneId: z.string().uuid().optional().nullable(),
  requestedById: z.string().uuid().optional().nullable(),
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

const completeSchema = z.object({
  receivedById: z.string().uuid().optional().nullable(),
});

const approveSchema = z.object({
  approvedById: z.string().uuid(),
});

export class PurchaseOrderService {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly auditService: AuditService,
    private readonly purchaseApprovalService?: PurchaseApprovalService,
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

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasSupplier(tenantId, data.supplierId),
      'Supplier not found in tenant',
    );

    const totals = calculatePurchaseTotals(
      data.lines.map((line) => ({
        quantity: line.quantity ?? 1,
        unitCost: line.unitCost,
      })),
    );
    const orderNo = await this.documentNumberGenerator.next(tenantId, 'PO', {
      branchId: data.branchId,
    });

    const order = await this.purchaseOrderRepository.create(tenantId, {
      orderNo,
      status: 'DRAFT',
      billingStatus: 'UNBILLED',
      orderDate: data.orderDate ?? new Date(),
      expectedDate: data.expectedDate ?? null,
      currency: data.currency ?? 'SAR',
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      supplier: { connect: { id: data.supplierId } },
      ...(data.purchaseRequestId
        ? { purchaseRequest: { connect: { id: data.purchaseRequestId } } }
        : {}),
      ...(data.purchaseRfqId ? { purchaseRfq: { connect: { id: data.purchaseRfqId } } } : {}),
      ...(data.supplierQuotationId
        ? { supplierQuotation: { connect: { id: data.supplierQuotationId } } }
        : {}),
      ...(data.warehouseZoneId ? { warehouseZone: { connect: { id: data.warehouseZoneId } } } : {}),
      ...(data.requestedById ? { requestedBy: { connect: { id: data.requestedById } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.purchaseOrderRepository.createLine(order.id, {
        lineNo: index + 1,
        quantity,
        unitCost: line.unitCost,
        totalCost: quantity * line.unitCost,
        notes: line.notes ?? null,
        product: { connect: { id: line.productId } },
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_order',
      entityId: order.id,
      newValues: order,
      context,
    });

    return this.getById(tenantId, order.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );
    PurchaseStatusEngine.assertPurchaseOrderTransition(order.status, 'SUBMITTED');
    const updated = await this.purchaseOrderRepository.update(tenantId, id, {
      status: 'SUBMITTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_order',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(approveSchema, input);
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );
    PurchaseStatusEngine.assertPurchaseOrderTransition(order.status, 'APPROVED');

    if (this.purchaseApprovalService) {
      const approval = await this.purchaseApprovalService.approveDocument(
        tenantId,
        {
          documentType: 'PURCHASE_ORDER',
          documentId: id,
          amount: Number(order.totalAmount),
          branchId: order.branchId,
        },
        input,
        context,
      );
      if (!approval.fullyApproved) {
        return { ...order, approvalPending: true, approvalSteps: approval.steps };
      }
    }

    const updated = await this.purchaseOrderRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedBy: { connect: { id: data.approvedById } },
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_order',
      entityId: id,
      newValues: { status: 'APPROVED', approvedById: data.approvedById },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );
    PurchaseStatusEngine.assertPurchaseOrderTransition(order.status, 'CANCELLED');

    if (
      ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status) &&
      this.purchaseAccountingIntegrationService
    ) {
      await this.purchaseAccountingIntegrationService.postPurchaseCancellation(
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

    const updated = await this.purchaseOrderRepository.update(tenantId, id, {
      status: 'CANCELLED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_order',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }

  async complete(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(completeSchema, input);
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );

    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Purchase order cannot be completed');
    }

    const refreshedOrder = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, id),
      'Purchase order not found',
    );
    const allReceived = refreshedOrder.lines.every((line) => line.receivedQty >= line.quantity);
    if (!allReceived) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Purchase order cannot be completed until all lines are received',
      );
    }

    const updated = await this.purchaseOrderRepository.update(tenantId, id, {
      status: 'RECEIVED',
    });

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
