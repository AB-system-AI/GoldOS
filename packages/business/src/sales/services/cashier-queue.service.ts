import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { LockEngine } from '../../inventory/engines/lock.engine.js';
import type { CashierQueueRepository } from '../repositories/cashier-queue.repository.js';
import type { SalesOrderRepository } from '../repositories/sales-order.repository.js';
import type { SalesNotificationService } from './sales-notification.service.js';

const submitSchema = z.object({
  salesOrderId: z.string().uuid(),
  sellerEmployeeId: z.string().uuid().optional().nullable(),
  priority: z.number().int().default(0),
  notes: z.string().optional().nullable(),
});

const transferSchema = z.object({
  toCashierEmployeeId: z.string().uuid(),
});

const AVG_MINUTES_PER_CUSTOMER = 5;

export class CashierQueueService {
  constructor(
    private readonly cashierQueueRepository: CashierQueueRepository,
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly lockEngine: LockEngine,
    private readonly salesNotificationService: SalesNotificationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.cashierQueueRepository.findById(tenantId, id), 'Queue entry not found');
  }

  list(tenantId: string, filters?: Parameters<CashierQueueRepository['list']>[1]) {
    return this.cashierQueueRepository.list(tenantId, filters);
  }

  async submitFromSeller(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(submitSchema, input);
    const order = await assertFound(
      this.salesOrderRepository.findById(tenantId, data.salesOrderId),
      'Sales order not found',
    );

    if (order.status !== 'DRAFT' && order.status !== 'PENDING_PAYMENT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Order not eligible for cashier queue');
    }

    const existing = await this.cashierQueueRepository.findBySalesOrderId(
      tenantId,
      data.salesOrderId,
    );
    if (existing && !['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Order already in queue');
    }

    const waitingCount = await this.cashierQueueRepository.countWaiting(tenantId, order.branchId);
    const estimatedWaitMinutes = (waitingCount + 1) * AVG_MINUTES_PER_CUSTOMER;

    const entry = await this.cashierQueueRepository.create(tenantId, {
      status: 'WAITING',
      priority: data.priority,
      queuePosition: waitingCount + 1,
      estimatedWaitMinutes,
      notes: data.notes ?? null,
      branch: { connect: { id: order.branchId } },
      salesOrder: { connect: { id: order.id } },
      ...(data.sellerEmployeeId
        ? { seller: { connect: { id: data.sellerEmployeeId } } }
        : order.sellerEmployeeId
          ? { seller: { connect: { id: order.sellerEmployeeId } } }
          : {}),
    });

    await this.salesOrderRepository.update(tenantId, order.id, {
      status: 'PENDING_PAYMENT',
      ...(data.sellerEmployeeId ? { seller: { connect: { id: data.sellerEmployeeId } } } : {}),
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: order.branchId,
      eventType: 'QUEUE_WAITING',
      referenceType: 'cashier_queue',
      referenceId: entry.id,
      title: 'Customer waiting at cashier',
      body: `Order ${order.orderNo} queued (position ${String(entry.queuePosition ?? '')})`,
      payload: { salesOrderId: order.id, estimatedWaitMinutes },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'cashier_queue',
      entityId: entry.id,
      newValues: entry,
      context,
    });

    return this.getById(tenantId, entry.id);
  }

  async callNext(
    tenantId: string,
    branchId: string,
    cashierEmployeeId: string,
    context?: AuditContext,
  ) {
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, branchId),
      'Branch not found in tenant',
    );

    const waiting = await this.cashierQueueRepository.list(tenantId, {
      branchId,
      status: 'WAITING',
      take: 1,
    });
    const next = waiting[0];
    if (!next) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'No customers waiting');
    }

    const updated = await this.cashierQueueRepository.update(tenantId, next.id, {
      status: 'CALLING',
      calledAt: new Date(),
      cashier: { connect: { id: cashierEmployeeId } },
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId,
      eventType: 'QUEUE_CALLING',
      referenceType: 'cashier_queue',
      referenceId: next.id,
      title: 'Customer called',
      body: `Order ${next.salesOrder.orderNo} called to cashier`,
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'cashier_queue',
      entityId: next.id,
      newValues: { action: 'call', cashierEmployeeId },
      context,
    });

    return updated;
  }

  async startProcessing(
    tenantId: string,
    id: string,
    cashierEmployeeId: string,
    context?: AuditContext,
  ) {
    const entry = await this.getById(tenantId, id);
    if (!['WAITING', 'CALLING'].includes(entry.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Queue entry not callable');
    }

    const updated = await this.cashierQueueRepository.update(tenantId, id, {
      status: 'PROCESSING',
      processingStartedAt: new Date(),
      cashier: { connect: { id: cashierEmployeeId } },
    });

    await this.salesOrderRepository.update(tenantId, entry.salesOrderId, {
      cashier: { connect: { id: cashierEmployeeId } },
      checkoutLockedAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'cashier_queue',
      entityId: id,
      newValues: { action: 'start_processing' },
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const entry = await this.getById(tenantId, id);
    if (entry.status !== 'PROCESSING') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Queue entry not processing');
    }

    const updated = await this.cashierQueueRepository.update(tenantId, id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'cashier_queue',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const entry = await this.getById(tenantId, id);
    if (['COMPLETED', 'CANCELLED'].includes(entry.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Queue entry already closed');
    }

    for (const line of entry.salesOrder.lines) {
      if (line.inventoryItemId) {
        await this.lockEngine.releaseByReference(tenantId, 'sales_order', entry.salesOrderId);
      }
    }

    const updated = await this.cashierQueueRepository.update(tenantId, id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'cashier_queue',
      entityId: id,
      newValues: { action: 'cancel' },
      context,
    });

    return updated;
  }

  async transfer(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const entry = await this.getById(tenantId, id);
    if (!['WAITING', 'CALLING', 'PROCESSING'].includes(entry.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Cannot transfer closed queue entry');
    }

    const data = parseInput(transferSchema, input);
    const updated = await this.cashierQueueRepository.update(tenantId, id, {
      cashier: { connect: { id: data.toCashierEmployeeId } },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'cashier_queue',
      entityId: id,
      newValues: { action: 'transfer', toCashierEmployeeId: data.toCashierEmployeeId },
      context,
    });

    return updated;
  }
}
