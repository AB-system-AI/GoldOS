import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, asJson, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { GoldPriceEngineService } from '../../engines/gold-price/gold-price.service.js';
import type { LifecycleEngine } from '../../inventory/engines/lifecycle.engine.js';
import type { MovementEngine } from '../../inventory/engines/movement.engine.js';
import { calculateExchangeTotals } from '../engines/exchange.engine.js';
import { buildPriceSnapshot } from '../engines/price-snapshot.engine.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { InvoiceRepository } from '../repositories/invoice.repository.js';
import type { SalesExchangeRepository } from '../repositories/sales-exchange.repository.js';
import type { SalesNotificationService } from './sales-notification.service.js';
import type { ExchangeRateSnapshotService } from './exchange-rate-snapshot.service.js';
import type { SalesAccountingIntegrationService } from '../../accounting/services/integration.service.js';

const lineSchema = z.object({
  direction: z.enum(['RETURN', 'NEW_SALE']),
  invoiceItemId: z.string().uuid().optional().nullable(),
  inventoryItemId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  buybackId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  amount: z.number().min(0),
  weight: z.number().optional().nullable(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional().nullable(),
  reason: z.string().optional().nullable(),
});

const createSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  originalInvoiceId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default('SAR'),
  lines: z.array(lineSchema).min(1),
  notes: z.string().optional().nullable(),
});

const evaluateSchema = z.object({
  evaluationNotes: z.string().optional().nullable(),
});

const approveSchema = z.object({
  approvedById: z.string().uuid(),
});

const rejectSchema = z.object({
  rejectionReason: z.string().min(1),
});

const completeSchema = z.object({
  newInvoiceId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
});

export class SalesExchangeService {
  constructor(
    private readonly salesExchangeRepository: SalesExchangeRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly goldPriceService: GoldPriceEngineService,
    private readonly exchangeRateSnapshotService: ExchangeRateSnapshotService,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly salesNotificationService: SalesNotificationService,
    private readonly auditService: AuditService,
    private readonly salesAccountingIntegrationService?: SalesAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.salesExchangeRepository.findById(tenantId, id),
      'Sales exchange not found',
    );
  }

  list(tenantId: string, filters?: Parameters<SalesExchangeRepository['list']>[1]) {
    return this.salesExchangeRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasCustomer(tenantId, data.customerId),
      'Customer not found in tenant',
    );

    const invoice = await assertFound(
      this.invoiceRepository.findById(tenantId, data.originalInvoiceId),
      'Original invoice not found',
    );
    if (!['ISSUED', 'COMPLETED'].includes(invoice.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Invoice not eligible for exchange');
    }

    const totals = calculateExchangeTotals(
      data.lines.map((l) => ({
        direction: l.direction,
        amount: l.amount,
        quantity: l.quantity ?? 1,
      })),
    );

    const goldRates = await this.goldPriceService.getBranchPricing(
      tenantId,
      data.branchId,
      data.currency,
    );
    const exchangeRateSnapshot = await this.exchangeRateSnapshotService.buildSnapshot({
      tenantId,
      branchId: data.branchId,
      currencyCode: data.currency ?? goldRates.currency,
      goldPricing: goldRates,
    });
    const pricingSnapshot = buildPriceSnapshot({
      lines: data.lines
        .filter(
          (l): l is typeof l & { productId: string } =>
            l.direction === 'NEW_SALE' && Boolean(l.productId),
        )
        .map((l) => ({
          productId: l.productId,
          inventoryItemId: l.inventoryItemId,
          quantity: l.quantity ?? 1,
          unitPrice: l.amount,
        })),
      goldRates: goldRates.quotes,
      exchangeRateSnapshot,
      currency: goldRates.currency,
    });

    const exchangeNo = await this.documentNumberGenerator.next(tenantId, 'EXCHANGE', {
      branchId: data.branchId,
    });

    const exchange = await this.salesExchangeRepository.create(tenantId, {
      exchangeNo,
      status: 'DRAFT',
      returnAmount: totals.returnAmount,
      newSaleAmount: totals.newSaleAmount,
      priceDifference: totals.priceDifference,
      refundAmount: totals.refundAmount,
      currency: data.currency,
      goldRateSnapshot: asJson(goldRates),
      exchangeRateSnapshot: asJson(exchangeRateSnapshot),
      pricingSnapshot: asJson(pricingSnapshot),
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      customer: { connect: { id: data.customerId } },
      originalInvoice: { connect: { id: invoice.id } },
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      await this.salesExchangeRepository.createLine(exchange.id, {
        lineNo: index + 1,
        direction: line.direction,
        quantity: line.quantity ?? 1,
        amount: line.amount,
        weight: line.weight ?? null,
        karat: line.karat ?? null,
        reason: line.reason ?? null,
        pricingSnapshot: asJson(line),
        ...(line.invoiceItemId ? { invoiceItem: { connect: { id: line.invoiceItemId } } } : {}),
        ...(line.inventoryItemId
          ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
          : {}),
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
        ...(line.buybackId ? { buyback: { connect: { id: line.buybackId } } } : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'sales_exchange',
      entityId: exchange.id,
      newValues: exchange,
      context,
    });

    return this.getById(tenantId, exchange.id);
  }

  async submitForEvaluation(tenantId: string, id: string, context?: AuditContext) {
    const exchange = await this.getById(tenantId, id);
    if (exchange.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft exchanges can be evaluated');
    }

    const updated = await this.salesExchangeRepository.update(tenantId, id, {
      status: 'EVALUATION',
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_exchange',
      entityId: id,
      newValues: { action: 'submit_evaluation' },
      context,
    });

    return updated;
  }

  async evaluate(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const exchange = await this.getById(tenantId, id);
    if (exchange.status !== 'EVALUATION' && exchange.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Exchange not in evaluation');
    }

    const data = parseInput(evaluateSchema, input);
    const updated = await this.salesExchangeRepository.update(tenantId, id, {
      status: 'PENDING_APPROVAL',
      evaluationNotes: data.evaluationNotes ?? null,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_exchange',
      entityId: id,
      newValues: { action: 'evaluate' },
      context,
    });

    return updated;
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const exchange = await this.getById(tenantId, id);
    if (!['PENDING_APPROVAL', 'EVALUATION'].includes(exchange.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Exchange not pending approval');
    }

    const data = parseInput(approveSchema, input);
    const updated = await this.salesExchangeRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedAt: new Date(),
      approver: { connect: { id: data.approvedById } },
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: exchange.branchId,
      eventType: 'EXCHANGE_APPROVED',
      referenceType: 'sales_exchange',
      referenceId: id,
      title: 'Exchange approved',
      body: `Exchange ${exchange.exchangeNo} approved`,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_exchange',
      entityId: id,
      newValues: { action: 'approve' },
      context,
    });

    return updated;
  }

  async reject(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const exchange = await this.getById(tenantId, id);
    if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(exchange.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Exchange cannot be rejected');
    }

    const data = parseInput(rejectSchema, input);
    const updated = await this.salesExchangeRepository.update(tenantId, id, {
      status: 'REJECTED',
      rejectionReason: data.rejectionReason,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_exchange',
      entityId: id,
      newValues: { action: 'reject', reason: data.rejectionReason },
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const exchange = await this.getById(tenantId, id);
    if (exchange.status !== 'APPROVED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Exchange must be approved before completion',
      );
    }

    const data = parseInput(completeSchema, input);

    for (const line of exchange.lines) {
      if (line.direction === 'RETURN' && line.inventoryItemId) {
        await this.movementEngine.record({
          tenantId,
          branchId: exchange.branchId,
          inventoryItemId: line.inventoryItemId,
          type: 'RETURN',
          quantity: line.quantity,
          referenceType: 'sales_exchange',
          referenceId: exchange.id,
          performedById: context?.userId ?? exchange.employeeId,
          reason: `Exchange return: ${exchange.exchangeNo}`,
          auditContext: context,
        });
        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage: 'AVAILABLE',
          reason: `Exchange return ${exchange.exchangeNo}`,
          performedById: context?.userId ?? exchange.employeeId,
          branchId: exchange.branchId,
          skipLockCheck: true,
        });
      }
      if (line.direction === 'NEW_SALE' && line.inventoryItemId) {
        await this.movementEngine.record({
          tenantId,
          branchId: exchange.branchId,
          inventoryItemId: line.inventoryItemId,
          type: 'SALE',
          quantity: line.quantity,
          referenceType: 'sales_exchange',
          referenceId: exchange.id,
          performedById: context?.userId ?? exchange.employeeId,
          reason: `Exchange sale: ${exchange.exchangeNo}`,
          auditContext: context,
        });
        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage: 'SOLD',
          reason: `Exchange sale ${exchange.exchangeNo}`,
          performedById: context?.userId ?? exchange.employeeId,
          branchId: exchange.branchId,
          skipLockCheck: true,
        });
      }
    }

    const updated = await this.salesExchangeRepository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
      ...(data.newInvoiceId ? { newInvoice: { connect: { id: data.newInvoiceId } } } : {}),
    });

    if (this.salesAccountingIntegrationService) {
      await this.salesAccountingIntegrationService.postExchange(
        tenantId,
        {
          exchangeId: exchange.id,
          branchId: exchange.branchId,
          customerId: exchange.customerId,
          returnAmount: Number(exchange.returnAmount),
          newSaleAmount: Number(exchange.newSaleAmount),
          priceDifference: Number(exchange.priceDifference),
          cogsAmount: Number(exchange.newSaleAmount) * 0.6,
          entryDate: new Date(),
        },
        context,
      );
    }

    await this.salesNotificationService.emit({
      tenantId,
      branchId: exchange.branchId,
      eventType: 'EXCHANGE_COMPLETED',
      referenceType: 'sales_exchange',
      referenceId: id,
      title: 'Exchange completed',
      body: `Exchange ${exchange.exchangeNo} completed`,
      payload: {
        refundAmount: Number(exchange.refundAmount),
        additionalPayment:
          Number(exchange.priceDifference) > 0 ? Number(exchange.priceDifference) : 0,
      },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_exchange',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }
}
