import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { PurchaseOrderRepository } from '../../accounting/repositories/purchase-order.repository.js';

import {
  assertBillingQuantity,
  calculateBillingStatus,
  calculatePurchaseTotals,
} from '../engines/purchase-calculation.engine.js';
import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PurchaseInvoiceRepository } from '../repositories/purchase-invoice.repository.js';
import type { PurchasingIntegrationService } from './purchasing-integration.service.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  goodsReceiptId: z.string().uuid().optional().nullable(),
  supplierInvoiceNo: z.string().optional().nullable(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        purchaseOrderLineId: z.string().uuid().optional().nullable(),
        productId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().min(1).default(1),
        unitCost: z.number().min(0),
        taxAmount: z.number().min(0).optional(),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export class PurchaseInvoiceService {
  constructor(
    private readonly purchaseInvoiceRepository: PurchaseInvoiceRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly purchasingIntegrationService: PurchasingIntegrationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.purchaseInvoiceRepository.findById(tenantId, id),
      'Purchase invoice not found',
    );
  }

  list(tenantId: string, filters?: Parameters<PurchaseInvoiceRepository['list']>[1]) {
    return this.purchaseInvoiceRepository.list(tenantId, filters);
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
      data.lines.map((line) => {
        const quantity = line.quantity ?? 1;
        return {
          quantity,
          unitCost: line.unitCost,
          taxRate: line.taxAmount ? line.taxAmount / (quantity * line.unitCost || 1) : 0,
        };
      }),
    );
    const invoiceNo = await this.documentNumberGenerator.next(tenantId, 'PI', {
      branchId: data.branchId,
    });

    const invoice = await this.purchaseInvoiceRepository.create(tenantId, {
      invoiceNo,
      status: 'DRAFT',
      supplierInvoiceNo: data.supplierInvoiceNo ?? null,
      invoiceDate: data.invoiceDate ?? new Date(),
      dueDate: data.dueDate ?? null,
      currency: data.currency ?? 'SAR',
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      supplier: { connect: { id: data.supplierId } },
      ...(data.purchaseOrderId ? { purchaseOrder: { connect: { id: data.purchaseOrderId } } } : {}),
      ...(data.goodsReceiptId ? { goodsReceipt: { connect: { id: data.goodsReceiptId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.purchaseInvoiceRepository.createLine(invoice.id, {
        lineNo: index + 1,
        quantity,
        unitCost: line.unitCost,
        taxAmount: line.taxAmount ?? 0,
        totalCost: quantity * line.unitCost + (line.taxAmount ?? 0),
        notes: line.notes ?? null,
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
        ...(line.purchaseOrderLineId
          ? { purchaseOrderLine: { connect: { id: line.purchaseOrderLineId } } }
          : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_invoice',
      entityId: invoice.id,
      newValues: invoice,
      context,
    });

    return this.getById(tenantId, invoice.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const invoice = await assertFound(
      this.purchaseInvoiceRepository.findById(tenantId, id),
      'Purchase invoice not found',
    );
    PurchaseStatusEngine.assertPurchaseInvoiceTransition(invoice.status, 'SUBMITTED');
    const updated = await this.purchaseInvoiceRepository.update(tenantId, id, {
      status: 'SUBMITTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_invoice',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async approve(tenantId: string, id: string, context?: AuditContext) {
    const invoice = await assertFound(
      this.purchaseInvoiceRepository.findById(tenantId, id),
      'Purchase invoice not found',
    );
    PurchaseStatusEngine.assertPurchaseInvoiceTransition(invoice.status, 'APPROVED');

    await this.purchasingIntegrationService.postPurchaseInvoiceAccounting(
      tenantId,
      {
        purchaseInvoiceId: invoice.id,
        supplierId: invoice.supplierId,
        branchId: invoice.branchId,
        totalAmount: Number(invoice.totalAmount),
        taxAmount: Number(invoice.taxAmount),
        entryDate: invoice.invoiceDate,
        linkedToGrn: Boolean(invoice.goodsReceiptId),
      },
      context,
    );

    if (invoice.purchaseOrderId) {
      const order = await this.purchaseOrderRepository.findById(tenantId, invoice.purchaseOrderId);
      if (order) {
        for (const line of invoice.lines) {
          if (line.purchaseOrderLineId) {
            const poLine = order.lines.find((row) => row.id === line.purchaseOrderLineId);
            if (poLine) {
              assertBillingQuantity(
                { quantity: poLine.quantity, billedQty: poLine.billedQty },
                line.quantity,
              );
            }
            await this.purchaseOrderRepository.incrementBilledQty(
              line.purchaseOrderLineId,
              line.quantity,
            );
          }
        }
        const invoicedAmount = Number(order.invoicedAmount) + Number(invoice.totalAmount);
        const billingStatus = calculateBillingStatus(Number(order.totalAmount), invoicedAmount);
        await this.purchaseOrderRepository.update(tenantId, order.id, {
          invoicedAmount,
          billingStatus,
        });
      }
    }

    const updated = await this.purchaseInvoiceRepository.update(tenantId, id, {
      status: 'APPROVED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_invoice',
      entityId: id,
      newValues: { status: 'APPROVED' },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const invoice = await assertFound(
      this.purchaseInvoiceRepository.findById(tenantId, id),
      'Purchase invoice not found',
    );
    PurchaseStatusEngine.assertPurchaseInvoiceTransition(invoice.status, 'CANCELLED');
    const updated = await this.purchaseInvoiceRepository.update(tenantId, id, {
      status: 'CANCELLED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_invoice',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }

  async recordPayment(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const schema = z.object({
      amount: z.number().positive(),
      paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD']).optional(),
      reference: z.string().optional().nullable(),
    });
    const data = parseInput(schema, input);
    const invoice = await assertFound(
      this.purchaseInvoiceRepository.findById(tenantId, id),
      'Purchase invoice not found',
    );

    if (!['APPROVED', 'PARTIALLY_PAID'].includes(invoice.status)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Invoice must be approved before recording payment',
      );
    }

    const paidAmount = Number(invoice.paidAmount) + data.amount;
    if (paidAmount > Number(invoice.totalAmount)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Payment exceeds invoice total');
    }

    const status = paidAmount >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';

    await this.purchasingIntegrationService.postSupplierPaymentAccounting(
      tenantId,
      {
        paymentId: `${invoice.id}:${String(paidAmount)}`,
        supplierId: invoice.supplierId,
        branchId: invoice.branchId,
        amount: data.amount,
        entryDate: new Date(),
      },
      context,
    );

    const updated = await this.purchaseInvoiceRepository.update(tenantId, id, {
      paidAmount,
      status,
    });

    if (invoice.purchaseOrderId) {
      const order = await this.purchaseOrderRepository.findById(tenantId, invoice.purchaseOrderId);
      if (order) {
        await this.purchaseOrderRepository.update(tenantId, order.id, {
          paidAmount: Number(order.paidAmount) + data.amount,
        });
      }
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_invoice',
      entityId: id,
      newValues: { paidAmount, status, payment: data },
      context,
    });

    return updated;
  }
}
