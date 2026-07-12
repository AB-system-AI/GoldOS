import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, asJson, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { GoldPriceEngineService } from '../../engines/gold-price/gold-price.service.js';
import { buildPrintPayload, calculateInvoiceTotals } from '../engines/invoice.engine.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { InvoiceRepository } from '../repositories/invoice.repository.js';
import type { SalesOrderRepository } from '../repositories/sales-order.repository.js';
import type { SalesLineInput } from '../types/sales.types.js';
import type { SalesNotificationService } from './sales-notification.service.js';

const createFromOrderSchema = z.object({
  salesOrderId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
});

const issueInvoiceSchema = z.object({
  employeeId: z.string().uuid().optional().nullable(),
});

export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly goldPriceService: GoldPriceEngineService,
    private readonly auditService: AuditService,
    private readonly salesNotificationService?: SalesNotificationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.invoiceRepository.findById(tenantId, id), 'Invoice not found');
  }

  list(tenantId: string, filters?: Parameters<InvoiceRepository['list']>[1]) {
    return this.invoiceRepository.list(tenantId, filters);
  }

  async createFromOrder(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createFromOrderSchema, input);
    const order = await assertFound(
      this.salesOrderRepository.findById(tenantId, data.salesOrderId),
      'Sales order not found',
    );

    if (['CANCELLED', 'CLOSED'].includes(order.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Cannot invoice cancelled order');
    }

    const goldRates = await this.goldPriceService.getBranchPricing(
      tenantId,
      order.branchId,
      order.currency,
    );
    const lines: SalesLineInput[] = order.lines.map((line) => ({
      productId: line.productId,
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      discount: Number(line.discount),
    }));
    const totals = calculateInvoiceTotals({ lines });

    const invoiceNo = await this.documentNumberGenerator.next(tenantId, 'INVOICE', {
      branchId: order.branchId,
    });

    const employeeId = data.employeeId ?? order.employeeId;

    const invoice = await this.invoiceRepository.create(tenantId, {
      invoiceNo,
      type: 'SALE',
      status: 'DRAFT',
      paymentStatus: totals.paymentStatus,
      currency: order.currency,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: totals.amountPaid,
      amountDue: totals.amountDue,
      goldRateSnapshot: order.goldRateSnapshot ? asJson(order.goldRateSnapshot) : asJson(goldRates),
      exchangeRateSnapshot: order.exchangeRateSnapshot
        ? asJson(order.exchangeRateSnapshot)
        : undefined,
      pricingSnapshot: order.pricingSnapshot ? asJson(order.pricingSnapshot) : undefined,
      notes: order.notes,
      branch: { connect: { id: order.branchId } },
      customer: { connect: { id: order.customerId } },
      salesOrder: { connect: { id: order.id } },
      ...(employeeId ? { employee: { connect: { id: employeeId } } } : {}),
    });

    for (const line of order.lines) {
      await this.invoiceRepository.createItem(invoice.id, {
        lineNo: line.lineNo,
        description: line.product.name || `Product ${line.productId}`,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
        taxAmount: line.taxAmount,
        totalAmount: line.totalAmount,
        weight: line.weight,
        karat: line.karat,
        metadata: line.pricingSnapshot ?? {},
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
        ...(line.inventoryItemId
          ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
          : {}),
      });
    }

    await this.salesOrderRepository.update(tenantId, order.id, { status: 'INVOICED' });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: invoice.id,
      newValues: invoice,
      context,
    });

    return this.getById(tenantId, invoice.id);
  }

  async issue(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.invoiceRepository.findById(tenantId, id),
      'Invoice not found',
    );
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft invoices can be issued');
    }

    parseInput(issueInvoiceSchema, input ?? {});

    const qrCode = `INV:${existing.invoiceNo}:${id}`;
    const barcode = existing.invoiceNo;

    const updated = await this.invoiceRepository.update(tenantId, id, {
      status: 'ISSUED',
      issuedAt: new Date(),
      qrCode,
      barcode,
    });

    await this.salesNotificationService?.emit({
      tenantId,
      branchId: existing.branchId,
      eventType: 'INVOICE_ISSUED',
      referenceType: 'invoice',
      referenceId: id,
      title: 'Invoice issued',
      body: `Invoice ${existing.invoiceNo} issued`,
      payload: { qrCode, barcode },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      newValues: { action: 'issue' },
      context,
    });

    return updated;
  }

  async getPrintPayload(tenantId: string, id: string) {
    const invoice = await this.getById(tenantId, id);
    return buildPrintPayload(invoice);
  }

  async voidInvoice(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.invoiceRepository.findById(tenantId, id),
      'Invoice not found',
    );
    if (existing.status === 'VOIDED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Invoice already voided');
    }

    const updated = await this.invoiceRepository.update(tenantId, id, {
      status: 'VOIDED',
      voidedAt: new Date(),
      paymentStatus: 'VOIDED',
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: id,
      newValues: { action: 'void' },
      context,
    });

    return updated;
  }
}
