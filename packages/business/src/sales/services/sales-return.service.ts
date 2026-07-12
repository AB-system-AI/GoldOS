import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { LifecycleEngine } from '../../inventory/engines/lifecycle.engine.js';
import type { MovementEngine } from '../../inventory/engines/movement.engine.js';
import { calculateReturnRefund } from '../engines/return.engine.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { InvoiceRepository } from '../repositories/invoice.repository.js';
import type { SalesReturnRepository } from '../repositories/sales-return.repository.js';
import type { LoyaltyService } from './loyalty.service.js';
import type { SalesNotificationService } from './sales-notification.service.js';
import type { SalesAccountingIntegrationService } from '../../accounting/services/integration.service.js';

const createReturnSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        invoiceItemId: z.string().uuid().optional().nullable(),
        inventoryItemId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().min(1).default(1),
        refundAmount: z.number().min(0),
        reason: z.string().optional().nullable(),
      }),
    )
    .min(1),
  notes: z.string().optional().nullable(),
});

const approveSchema = z.object({
  approvedById: z.string().uuid(),
});

export class SalesReturnService {
  constructor(
    private readonly salesReturnRepository: SalesReturnRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly auditService: AuditService,
    private readonly loyaltyService?: LoyaltyService,
    private readonly salesNotificationService?: SalesNotificationService,
    private readonly salesAccountingIntegrationService?: SalesAccountingIntegrationService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.salesReturnRepository.findById(tenantId, id), 'Sales return not found');
  }

  list(tenantId: string, filters?: Parameters<SalesReturnRepository['list']>[1]) {
    return this.salesReturnRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createReturnSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasCustomer(tenantId, data.customerId),
      'Customer not found in tenant',
    );

    const invoice = await assertFound(
      this.invoiceRepository.findById(tenantId, data.invoiceId),
      'Invoice not found',
    );
    if (invoice.status !== 'COMPLETED' && invoice.status !== 'ISSUED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Invoice is not eligible for return');
    }

    const refundAmount = calculateReturnRefund(
      data.lines.map((line) => ({
        ...line,
        quantity: line.quantity ?? 1,
      })),
    );
    const returnNo = await this.documentNumberGenerator.next(tenantId, 'RETURN', {
      branchId: data.branchId,
    });

    const salesReturn = await this.salesReturnRepository.create(tenantId, {
      returnNo,
      status: 'DRAFT',
      refundAmount,
      currency: invoice.currency,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      customer: { connect: { id: data.customerId } },
      invoice: { connect: { id: invoice.id } },
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.salesReturnRepository.createLine(salesReturn.id, {
        lineNo: index + 1,
        quantity,
        refundAmount: line.refundAmount,
        reason: line.reason ?? null,
        ...(line.invoiceItemId ? { invoiceItem: { connect: { id: line.invoiceItemId } } } : {}),
        ...(line.inventoryItemId
          ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
          : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'sales_return',
      entityId: salesReturn.id,
      newValues: salesReturn,
      context,
    });

    return this.getById(tenantId, salesReturn.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.salesReturnRepository.findById(tenantId, id),
      'Sales return not found',
    );
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft returns can be submitted');
    }

    const updated = await this.salesReturnRepository.update(tenantId, id, {
      status: 'PENDING_APPROVAL',
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_return',
      entityId: id,
      newValues: { action: 'submit' },
      context,
    });

    return updated;
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(approveSchema, input);
    const existing = await assertFound(
      this.salesReturnRepository.findById(tenantId, id),
      'Sales return not found',
    );
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Return is not pending approval');
    }

    const updated = await this.salesReturnRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedAt: new Date(),
      approver: { connect: { id: data.approvedById } },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_return',
      entityId: id,
      newValues: { action: 'approve' },
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const salesReturn = await assertFound(
      this.salesReturnRepository.findById(tenantId, id),
      'Sales return not found',
    );
    if (salesReturn.status !== 'APPROVED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Return must be approved before completion',
      );
    }

    for (const line of salesReturn.lines) {
      if (!line.inventoryItemId) continue;

      await this.movementEngine.record({
        tenantId,
        branchId: salesReturn.branchId,
        inventoryItemId: line.inventoryItemId,
        type: 'RETURN',
        quantity: line.quantity,
        referenceType: 'sales_return',
        referenceId: salesReturn.id,
        performedById: context?.userId ?? salesReturn.employeeId,
        reason: `Return ${salesReturn.returnNo}`,
        auditContext: context,
      });

      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        toStage: 'RETURNED',
        reason: `Returned: ${salesReturn.returnNo}`,
        performedById: context?.userId ?? salesReturn.employeeId,
        branchId: salesReturn.branchId,
        skipLockCheck: true,
      });

      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        toStage: 'AVAILABLE',
        reason: `Restocked after return ${salesReturn.returnNo}`,
        performedById: context?.userId ?? salesReturn.employeeId,
        branchId: salesReturn.branchId,
        skipLockCheck: true,
      });
    }

    const updated = await this.salesReturnRepository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    if (this.salesAccountingIntegrationService) {
      const invoice = salesReturn.invoiceId
        ? await this.invoiceRepository.findById(tenantId, salesReturn.invoiceId)
        : null;
      const refundAmount = Number(salesReturn.refundAmount);
      const taxAmount = invoice
        ? Number(invoice.taxAmount) * (refundAmount / Number(invoice.totalAmount))
        : 0;
      const cogsAmount = salesReturn.lines.reduce(
        (sum, line) => sum + Number(line.refundAmount) * 0.6,
        0,
      );

      await this.salesAccountingIntegrationService.postSalesReturn(
        tenantId,
        {
          returnId: salesReturn.id,
          branchId: salesReturn.branchId,
          customerId: salesReturn.customerId,
          refundAmount,
          taxAmount,
          cogsAmount,
          entryDate: new Date(),
        },
        context,
      );
    }

    const refundPoints = Math.floor(Number(salesReturn.refundAmount) * 0.01);
    if (refundPoints > 0) {
      await this.loyaltyService?.reverse(
        tenantId,
        salesReturn.customerId,
        refundPoints,
        { type: 'sales_return', id: salesReturn.id },
        `Loyalty reversal for return ${salesReturn.returnNo}`,
        context,
      );
    }

    await this.salesNotificationService?.emit({
      tenantId,
      branchId: salesReturn.branchId,
      eventType: 'RETURN_COMPLETED',
      referenceType: 'sales_return',
      referenceId: id,
      title: 'Return completed',
      body: `Return ${salesReturn.returnNo} completed`,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_return',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }
}
