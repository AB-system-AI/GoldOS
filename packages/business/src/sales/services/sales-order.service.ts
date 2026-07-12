import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, asJson, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { GoldPriceEngineService } from '../../engines/gold-price/gold-price.service.js';
import type { LifecycleEngine } from '../../inventory/engines/lifecycle.engine.js';
import type { MovementEngine } from '../../inventory/engines/movement.engine.js';
import type { InventoryItemRepository } from '../../inventory/repositories/inventory-item.repository.js';
import { calculateOrderTotals } from '../engines/sales-calculation.engine.js';
import { buildPriceSnapshot } from '../engines/price-snapshot.engine.js';
import type { ExchangeRateSnapshotService } from './exchange-rate-snapshot.service.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { SalesOrderRepository } from '../repositories/sales-order.repository.js';
import type { SalesLineInput } from '../types/sales.types.js';
import type { LockEngine } from '../../inventory/engines/lock.engine.js';

const lineSchema = z.object({
  productId: z.string().uuid(),
  inventoryItemId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  weight: z.number().optional().nullable(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional().nullable(),
  makingCharge: z.number().optional(),
  stoneCost: z.number().optional(),
  goldValue: z.number().optional(),
  notes: z.string().optional().nullable(),
});

const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid(),
  organizationId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  posSessionId: z.string().uuid().optional().nullable(),
  reservationId: z.string().uuid().optional().nullable(),
  sellerEmployeeId: z.string().uuid().optional().nullable(),
  orderDate: z.coerce.date().optional(),
  currency: z.string().length(3).default('SAR'),
  lines: z.array(lineSchema).min(1),
  orderDiscount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

const updateOrderSchema = z.object({
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).optional(),
  orderDiscount: z.number().min(0).optional(),
});

export class SalesOrderService {
  constructor(
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly inventoryItemRepository: InventoryItemRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly goldPriceService: GoldPriceEngineService,
    private readonly exchangeRateSnapshotService: ExchangeRateSnapshotService,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly lockEngine: LockEngine,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.salesOrderRepository.findById(tenantId, id), 'Sales order not found');
  }

  list(tenantId: string, filters?: Parameters<SalesOrderRepository['list']>[1]) {
    return this.salesOrderRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createOrderSchema, input);
    await this.validateRefs(tenantId, data.branchId, data.customerId, data.organizationId);

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
    const priceSnapshot = buildPriceSnapshot({
      lines: data.lines as SalesLineInput[],
      goldRates: goldRates.quotes,
      exchangeRateSnapshot,
      currency: goldRates.currency,
      orderDiscount: data.orderDiscount ?? 0,
    });
    const totals = calculateOrderTotals(data.lines as SalesLineInput[], data.orderDiscount ?? 0);
    const orderNo = await this.documentNumberGenerator.next(tenantId, 'ORDER', {
      branchId: data.branchId,
    });

    await this.validateInventoryLines(
      tenantId,
      data.branchId,
      data.lines.map((line) => ({ ...line, quantity: line.quantity ?? 1 })),
    );

    const order = await this.salesOrderRepository.create(tenantId, {
      orderNo,
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      orderDate: data.orderDate ?? new Date(),
      currency: data.currency,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      goldRateSnapshot: asJson(goldRates),
      exchangeRateSnapshot: asJson(exchangeRateSnapshot),
      pricingSnapshot: asJson(priceSnapshot),
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      customer: { connect: { id: data.customerId } },
      ...(data.organizationId ? { organization: { connect: { id: data.organizationId } } } : {}),
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
      ...(data.sellerEmployeeId ? { seller: { connect: { id: data.sellerEmployeeId } } } : {}),
      ...(data.reservationId ? { reservation: { connect: { id: data.reservationId } } } : {}),
      ...(data.posSessionId ? { posSession: { connect: { id: data.posSessionId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      if (line.inventoryItemId) {
        await this.lockEngine.acquire({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          lockType: 'SALE',
          referenceType: 'sales_order',
          referenceId: order.id,
          lockedById: data.sellerEmployeeId ?? data.employeeId,
          reason: `Reserved for order ${order.orderNo}`,
        });
      }
      await this.salesOrderRepository.createLine(order.id, {
        lineNo: index + 1,
        quantity,
        unitPrice: line.unitPrice,
        discount: line.discount ?? 0,
        taxAmount: 0,
        totalAmount: line.unitPrice * quantity - (line.discount ?? 0),
        weight: line.weight ?? null,
        karat: line.karat ?? null,
        pricingSnapshot: asJson(line),
        notes: line.notes ?? null,
        product: { connect: { id: line.productId } },
        ...(line.inventoryItemId
          ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
          : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'sales_order',
      entityId: order.id,
      newValues: order,
      context,
    });

    return this.getById(tenantId, order.id);
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.salesOrderRepository.findById(tenantId, id),
      'Sales order not found',
    );
    if (existing.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft orders can be updated');
    }

    const data = parseInput(updateOrderSchema, input);
    let updateData: Parameters<SalesOrderRepository['update']>[2] = {};

    if (data.notes !== undefined) {
      updateData = { ...updateData, notes: data.notes };
    }

    if (data.lines) {
      await this.validateInventoryLines(
        tenantId,
        existing.branchId,
        data.lines.map((line) => ({ ...line, quantity: line.quantity ?? 1 })),
      );
      const totals = calculateOrderTotals(data.lines as SalesLineInput[], data.orderDiscount ?? 0);
      updateData = {
        ...updateData,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        pricingSnapshot: asJson({ totals, lines: data.lines }),
      };

      for (const line of existing.lines) {
        await this.salesOrderRepository.softDeleteLine(line.id);
      }

      for (const [index, line] of data.lines.entries()) {
        const quantity = line.quantity ?? 1;
        await this.salesOrderRepository.createLine(existing.id, {
          lineNo: index + 1,
          quantity,
          unitPrice: line.unitPrice,
          discount: line.discount ?? 0,
          taxAmount: 0,
          totalAmount: line.unitPrice * quantity - (line.discount ?? 0),
          weight: line.weight ?? null,
          karat: line.karat ?? null,
          pricingSnapshot: asJson(line),
          notes: line.notes ?? null,
          product: { connect: { id: line.productId } },
          ...(line.inventoryItemId
            ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
            : {}),
        });
      }
    }

    const updated = await this.salesOrderRepository.update(tenantId, id, updateData);
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      context,
    });
    return updated;
  }

  async confirm(tenantId: string, id: string, context?: AuditContext) {
    const order = await assertFound(
      this.salesOrderRepository.findById(tenantId, id),
      'Sales order not found',
    );
    if (order.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft orders can be confirmed');
    }

    for (const line of order.lines) {
      if (line.inventoryItemId) {
        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage: 'WITH_SALES',
          reason: `Sales order ${order.orderNo} confirmed`,
          performedById: context?.userId ?? order.employeeId,
          branchId: order.branchId,
        });
      }
    }

    const updated = await this.salesOrderRepository.update(tenantId, id, {
      status: 'PENDING_PAYMENT',
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      newValues: { action: 'confirm' },
      context,
    });

    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const order = await assertFound(
      this.salesOrderRepository.findById(tenantId, id),
      'Sales order not found',
    );
    if (!['PENDING_PAYMENT', 'CONFIRMED', 'INVOICED'].includes(order.status)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Order cannot be completed in current status',
      );
    }

    if (order.reservationId) {
      await this.lockEngine.releaseByReference(tenantId, 'reservation', order.reservationId);
    }

    for (const line of order.lines) {
      if (!line.inventoryItemId) continue;

      await this.movementEngine.record({
        tenantId,
        branchId: order.branchId,
        inventoryItemId: line.inventoryItemId,
        type: 'SALE',
        quantity: line.quantity,
        referenceType: 'sales_order',
        referenceId: order.id,
        performedById: context?.userId ?? order.employeeId,
        reason: `Sale completed: ${order.orderNo}`,
        auditContext: context,
      });

      await this.lifecycleEngine.transition({
        tenantId,
        inventoryItemId: line.inventoryItemId,
        toStage: 'SOLD',
        reason: `Sold via order ${order.orderNo}`,
        performedById: context?.userId ?? order.employeeId,
        branchId: order.branchId,
        skipLockCheck: true,
      });
    }

    const updated = await this.salesOrderRepository.update(tenantId, id, {
      status: 'COMPLETED',
      paymentStatus: order.paymentStatus === 'UNPAID' ? 'PAID' : order.paymentStatus,
      completedAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      newValues: { action: 'complete' },
      context,
    });

    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const order = await assertFound(
      this.salesOrderRepository.findById(tenantId, id),
      'Sales order not found',
    );
    if (['COMPLETED', 'CANCELLED', 'CLOSED'].includes(order.status)) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Order cannot be cancelled');
    }

    for (const line of order.lines) {
      if (!line.inventoryItemId) continue;
      await this.lockEngine.releaseByReference(tenantId, 'sales_order', order.id);
      const item = await this.inventoryItemRepository.findById(tenantId, line.inventoryItemId);
      if (item && ['WITH_SALES', 'PENDING_PAYMENT'].includes(item.lifecycleStage)) {
        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage: 'AVAILABLE',
          reason: `Sales order ${order.orderNo} cancelled`,
          performedById: context?.userId ?? order.employeeId,
          branchId: order.branchId,
          skipLockCheck: true,
        });
      }
    }

    const updated = await this.salesOrderRepository.update(tenantId, id, { status: 'CANCELLED' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'sales_order',
      entityId: id,
      newValues: { action: 'cancel' },
      context,
    });
    return updated;
  }

  private async validateRefs(
    tenantId: string,
    branchId: string,
    customerId: string,
    organizationId?: string | null,
  ) {
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasCustomer(tenantId, customerId),
      'Customer not found in tenant',
    );
    if (organizationId) {
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasOrganization(tenantId, organizationId),
        'Organization not found in tenant',
      );
    }
  }

  private async validateInventoryLines(
    tenantId: string,
    branchId: string,
    lines: z.output<typeof lineSchema>[],
  ) {
    for (const line of lines) {
      if (!line.inventoryItemId) continue;
      const item = await assertFound(
        this.inventoryItemRepository.findById(tenantId, line.inventoryItemId),
        'Inventory item not found',
      );
      if (item.branchId !== branchId) {
        throw new BusinessError(
          BusinessErrorCodes.TENANT_MISMATCH,
          'Inventory item does not belong to branch',
        );
      }
      if (item.lifecycleStage !== 'AVAILABLE' && item.lifecycleStage !== 'RESERVED') {
        throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Inventory item is not available');
      }
    }
  }
}
