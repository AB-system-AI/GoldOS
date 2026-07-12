import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import { summarizePayments, validatePaymentAllocations } from '../engines/payment.engine.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { InvoiceRepository } from '../repositories/invoice.repository.js';
import type { PaymentRepository } from '../repositories/payment.repository.js';
import type { SalesOrderRepository } from '../repositories/sales-order.repository.js';
import type { SalesAccountingIntegrationService } from '../../accounting/services/integration.service.js';
import type { PurchaseAccountingIntegrationService } from '../../accounting/services/integration.service.js';

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  method: z.enum([
    'CASH',
    'CARD',
    'BANK_TRANSFER',
    'CHEQUE',
    'MOBILE_WALLET',
    'GOLD_EXCHANGE',
    'STORE_CREDIT',
    'OTHER',
  ]),
  amount: z.number().positive(),
  currency: z.string().length(3).default('SAR'),
  reference: z.string().optional().nullable(),
  paidAt: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  skipAccounting: z.boolean().optional(),
});

const batchPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  payments: z.array(
    z.object({
      method: paymentSchema.shape.method,
      amount: z.number().positive(),
      reference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }),
  ),
});

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly auditService: AuditService,
    private readonly salesAccountingIntegrationService?: SalesAccountingIntegrationService,
    private readonly purchaseAccountingIntegrationService?: PurchaseAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.paymentRepository.findById(tenantId, id), 'Payment not found');
  }

  list(tenantId: string, filters?: Parameters<PaymentRepository['list']>[1]) {
    return this.paymentRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(paymentSchema, input);
    const invoice = await assertFound(
      this.invoiceRepository.findById(tenantId, data.invoiceId),
      'Invoice not found',
    );

    if (invoice.status === 'VOIDED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Cannot pay voided invoice');
    }

    const validation = validatePaymentAllocations(Number(invoice.totalAmount), [
      { method: data.method, amount: data.amount },
    ]);
    if (!validation.valid) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        validation.message ?? 'Invalid payment',
      );
    }

    const paymentNo = await this.documentNumberGenerator.next(tenantId, 'PAYMENT', {
      branchId: data.branchId ?? invoice.branchId,
    });

    const payment = await this.paymentRepository.create(tenantId, {
      paymentNo,
      method: data.method,
      status: 'PAID',
      amount: data.amount,
      currency: data.currency,
      reference: data.reference ?? null,
      paidAt: data.paidAt ?? new Date(),
      notes: data.notes ?? null,
      invoice: { connect: { id: invoice.id } },
      ...((data.branchId ?? invoice.branchId)
        ? { branch: { connect: { id: data.branchId ?? invoice.branchId } } }
        : {}),
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    });

    const amountDueBefore = Number(invoice.amountDue);
    await this.syncInvoicePaymentStatus(tenantId, invoice.id);

    if (
      !data.skipAccounting &&
      this.salesAccountingIntegrationService &&
      invoice.customerId &&
      data.method !== 'GOLD_EXCHANGE' &&
      amountDueBefore > 0
    ) {
      await this.salesAccountingIntegrationService.postCustomerPayment(
        tenantId,
        {
          paymentId: payment.id,
          customerId: invoice.customerId,
          branchId: data.branchId ?? invoice.branchId,
          amount: data.amount,
          entryDate: payment.paidAt,
        },
        context,
      );
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'payment',
      entityId: payment.id,
      newValues: payment,
      context,
    });

    return payment;
  }

  async createBatch(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(batchPaymentSchema, input);
    const invoice = await assertFound(
      this.invoiceRepository.findById(tenantId, data.invoiceId),
      'Invoice not found',
    );

    const validation = validatePaymentAllocations(
      Number(invoice.totalAmount),
      data.payments.map((p) => ({ method: p.method, amount: p.amount })),
    );
    if (!validation.valid) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        validation.message ?? 'Invalid payments',
      );
    }

    const created = [];
    for (const entry of data.payments) {
      const payment = await this.create(
        tenantId,
        {
          invoiceId: data.invoiceId,
          branchId: data.branchId ?? invoice.branchId,
          employeeId: data.employeeId,
          method: entry.method,
          amount: entry.amount,
          currency: invoice.currency,
          reference: entry.reference,
          notes: entry.notes,
          skipAccounting: true,
        },
        context,
      );
      created.push(payment);
    }

    return {
      payments: created,
      invoice: await this.invoiceRepository.findById(tenantId, invoice.id),
    };
  }

  private async syncInvoicePaymentStatus(tenantId: string, invoiceId: string) {
    const invoice = await this.invoiceRepository.findById(tenantId, invoiceId);
    if (!invoice) return;

    const aggregate = await this.paymentRepository.sumForInvoice(tenantId, invoiceId);
    const amountPaid = Number(aggregate._sum.amount ?? 0);
    const totalAmount = Number(invoice.totalAmount);
    const summary = summarizePayments(totalAmount, [{ method: 'CASH', amount: amountPaid }]);

    await this.invoiceRepository.update(tenantId, invoiceId, {
      amountPaid: summary.amountPaid,
      amountDue: summary.amountDue,
      paymentStatus: summary.paymentStatus,
      ...(summary.paymentStatus === 'PAID' ? { status: 'COMPLETED' } : {}),
    });

    if (invoice.salesOrderId) {
      await this.salesOrderRepository.update(tenantId, invoice.salesOrderId, {
        paymentStatus: summary.paymentStatus,
      });
    }
  }
}
