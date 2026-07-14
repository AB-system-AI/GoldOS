import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { PurchaseOrderRepository } from '../../accounting/repositories/purchase-order.repository.js';

import {
  assertReceiptQuantity,
  calculatePurchaseTotals,
  calculateReceivedStatus,
} from '../engines/purchase-calculation.engine.js';
import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { GoodsReceiptRepository } from '../repositories/goods-receipt.repository.js';
import type { PurchasingIntegrationService } from './purchasing-integration.service.js';
import type { SupplierPerformanceService } from './supplier-performance.service.js';

const lineSchema = z.object({
  purchaseOrderLineId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.number().min(0),
  weightGrams: z.number().optional().nullable(),
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional().nullable(),
  goldRateAtPurchase: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  branchId: z.string().uuid(),
  warehouseZoneId: z.string().uuid().optional().nullable(),
  receiptDate: z.coerce.date().optional(),
  receivedById: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

export class GoodsReceiptService {
  constructor(
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly purchasingIntegrationService: PurchasingIntegrationService,
    private readonly supplierPerformanceService: SupplierPerformanceService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.goodsReceiptRepository.findById(tenantId, id),
      'Goods receipt not found',
    );
  }

  list(tenantId: string, filters?: Parameters<GoodsReceiptRepository['list']>[1]) {
    return this.goodsReceiptRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, data.purchaseOrderId),
      'Purchase order not found',
    );

    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Purchase order is not open for receipt',
      );
    }

    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const totals = calculatePurchaseTotals(
      data.lines.map((line) => ({
        quantity: line.quantity ?? 1,
        unitCost: line.unitCost,
      })),
    );
    const receiptNo = await this.documentNumberGenerator.next(tenantId, 'GRN', {
      branchId: data.branchId,
    });

    const receipt = await this.goodsReceiptRepository.create(tenantId, {
      receiptNo,
      status: 'DRAFT',
      receiptDate: data.receiptDate ?? new Date(),
      totalAmount: totals.total,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      purchaseOrder: { connect: { id: order.id } },
      supplier: { connect: { id: order.supplierId } },
      ...(data.warehouseZoneId ? { warehouseZone: { connect: { id: data.warehouseZoneId } } } : {}),
      ...(data.receivedById ? { receivedBy: { connect: { id: data.receivedById } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.goodsReceiptRepository.createLine(receipt.id, {
        lineNo: index + 1,
        quantity,
        unitCost: line.unitCost,
        totalCost: quantity * line.unitCost,
        weightGrams: line.weightGrams ?? null,
        karat: line.karat ?? null,
        goldRateAtPurchase: line.goldRateAtPurchase ?? null,
        notes: line.notes ?? null,
        product: { connect: { id: line.productId } },
        ...(line.purchaseOrderLineId
          ? { purchaseOrderLine: { connect: { id: line.purchaseOrderLineId } } }
          : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'goods_receipt',
      entityId: receipt.id,
      newValues: receipt,
      context,
    });

    return this.getById(tenantId, receipt.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const receipt = await assertFound(
      this.goodsReceiptRepository.findById(tenantId, id),
      'Goods receipt not found',
    );
    PurchaseStatusEngine.assertGoodsReceiptTransition(receipt.status, 'SUBMITTED');
    const updated = await this.goodsReceiptRepository.update(tenantId, id, { status: 'SUBMITTED' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'goods_receipt',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async receive(tenantId: string, id: string, context?: AuditContext) {
    const receipt = await assertFound(
      this.goodsReceiptRepository.findById(tenantId, id),
      'Goods receipt not found',
    );
    if (receipt.status !== 'SUBMITTED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Goods receipt must be submitted before receiving',
      );
    }
    PurchaseStatusEngine.assertGoodsReceiptTransition(receipt.status, 'RECEIVED');

    const order = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, receipt.purchaseOrderId),
      'Purchase order not found',
    );

    for (const line of receipt.lines) {
      if (line.purchaseOrderLineId) {
        const poLine = order.lines.find((row) => row.id === line.purchaseOrderLineId);
        if (poLine) {
          assertReceiptQuantity(
            { quantity: poLine.quantity, receivedQty: poLine.receivedQty },
            line.quantity,
          );
        }
      }

      const items = await this.purchasingIntegrationService.receiveLineToInventory(
        tenantId,
        {
          productId: line.productId,
          branchId: receipt.branchId,
          warehouseZoneId: receipt.warehouseZoneId,
          supplierId: receipt.supplierId,
          quantity: line.quantity,
          unitCost: Number(line.unitCost),
          weightGrams: line.weightGrams ? Number(line.weightGrams) : null,
          karat: line.karat,
          goldRateAtPurchase: line.goldRateAtPurchase ? Number(line.goldRateAtPurchase) : null,
          performedById: receipt.receivedById,
          referenceType: 'goods_receipt',
          referenceId: receipt.id,
        },
        context,
      );

      if (items[0]) {
        await this.goodsReceiptRepository.updateLine(receipt.id, line.id, {
          inventoryItem: { connect: { id: items[0].id } },
        });
      }

      await this.auditService.log({
        tenantId,
        action: 'UPDATE',
        entityType: 'goods_receipt_line',
        entityId: line.id,
        newValues: {
          inventoryItemIds: items.map((item) => item.id),
          quantity: line.quantity,
        },
        context,
      });

      if (line.purchaseOrderLineId) {
        await this.purchaseOrderRepository.incrementReceivedQty(
          line.purchaseOrderLineId,
          line.quantity,
        );
      }
    }

    const refreshedOrder = await assertFound(
      this.purchaseOrderRepository.findById(tenantId, order.id),
      'Purchase order not found',
    );
    const nextStatus = calculateReceivedStatus(
      refreshedOrder.lines.map((row) => ({
        quantity: row.quantity,
        receivedQty: row.receivedQty,
      })),
    );
    PurchaseStatusEngine.assertPurchaseOrderTransition(order.status, nextStatus);
    await this.purchaseOrderRepository.update(tenantId, order.id, { status: nextStatus });

    await this.purchasingIntegrationService.postGoodsReceiptAccounting(
      tenantId,
      {
        goodsReceiptId: receipt.id,
        supplierId: receipt.supplierId,
        branchId: receipt.branchId,
        totalAmount: Number(receipt.totalAmount),
        entryDate: receipt.receiptDate,
      },
      context,
    );

    const updated = await this.goodsReceiptRepository.update(tenantId, id, { status: 'RECEIVED' });
    await this.supplierPerformanceService.recordMonthlySnapshot(tenantId, receipt.supplierId);
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'goods_receipt',
      entityId: id,
      newValues: { status: 'RECEIVED' },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const receipt = await assertFound(
      this.goodsReceiptRepository.findById(tenantId, id),
      'Goods receipt not found',
    );
    PurchaseStatusEngine.assertGoodsReceiptTransition(receipt.status, 'CANCELLED');
    const updated = await this.goodsReceiptRepository.update(tenantId, id, { status: 'CANCELLED' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'goods_receipt',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }
}
