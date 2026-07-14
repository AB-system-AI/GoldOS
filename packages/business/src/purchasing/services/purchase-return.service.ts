import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { MovementEngine } from '../../inventory/engines/movement.engine.js';
import type { LifecycleEngine } from '../../inventory/engines/lifecycle.engine.js';

import { calculatePurchaseTotals } from '../engines/purchase-calculation.engine.js';
import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PurchaseReturnRepository } from '../repositories/purchase-return.repository.js';
import type { PurchaseApprovalService } from './purchase-approval.service.js';
import type { PurchasingIntegrationService } from './purchasing-integration.service.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional().nullable(),
  goodsReceiptId: z.string().uuid().optional().nullable(),
  returnDate: z.coerce.date().optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        inventoryItemId: z.string().uuid().optional().nullable(),
        purchaseOrderLineId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().min(1).default(1),
        unitCost: z.number().min(0),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

const approveSchema = z.object({
  approvedById: z.string().uuid(),
});

export class PurchaseReturnService {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly movementEngine: MovementEngine,
    private readonly lifecycleEngine: LifecycleEngine,
    private readonly purchaseApprovalService: PurchaseApprovalService,
    private readonly purchasingIntegrationService: PurchasingIntegrationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
  }

  list(tenantId: string, filters?: Parameters<PurchaseReturnRepository['list']>[1]) {
    return this.purchaseReturnRepository.list(tenantId, filters);
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
    const returnNo = await this.documentNumberGenerator.next(tenantId, 'PRET', {
      branchId: data.branchId,
    });

    const purchaseReturn = await this.purchaseReturnRepository.create(tenantId, {
      returnNo,
      status: 'DRAFT',
      returnDate: data.returnDate ?? new Date(),
      totalAmount: totals.total,
      reason: data.reason ?? null,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      supplier: { connect: { id: data.supplierId } },
      ...(data.purchaseOrderId ? { purchaseOrder: { connect: { id: data.purchaseOrderId } } } : {}),
      ...(data.goodsReceiptId ? { goodsReceipt: { connect: { id: data.goodsReceiptId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.purchaseReturnRepository.createLine(purchaseReturn.id, {
        lineNo: index + 1,
        quantity,
        unitCost: line.unitCost,
        totalCost: quantity * line.unitCost,
        notes: line.notes ?? null,
        product: { connect: { id: line.productId } },
        ...(line.inventoryItemId
          ? { inventoryItem: { connect: { id: line.inventoryItemId } } }
          : {}),
        ...(line.purchaseOrderLineId
          ? { purchaseOrderLine: { connect: { id: line.purchaseOrderLineId } } }
          : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_return',
      entityId: purchaseReturn.id,
      newValues: purchaseReturn,
      context,
    });

    return this.getById(tenantId, purchaseReturn.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const purchaseReturn = await assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
    PurchaseStatusEngine.assertPurchaseReturnTransition(purchaseReturn.status, 'SUBMITTED');
    await this.purchaseApprovalService.initiateApproval(
      tenantId,
      {
        documentType: 'PURCHASE_RETURN',
        documentId: id,
        amount: Number(purchaseReturn.totalAmount),
        branchId: purchaseReturn.branchId,
      },
      context,
    );
    const updated = await this.purchaseReturnRepository.update(tenantId, id, {
      status: 'SUBMITTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_return',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(approveSchema, input);
    const purchaseReturn = await assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
    PurchaseStatusEngine.assertPurchaseReturnTransition(purchaseReturn.status, 'APPROVED');

    const approval = await this.purchaseApprovalService.approveDocument(
      tenantId,
      {
        documentType: 'PURCHASE_RETURN',
        documentId: id,
        amount: Number(purchaseReturn.totalAmount),
        branchId: purchaseReturn.branchId,
      },
      input,
      context,
    );
    if (!approval.fullyApproved) {
      return { ...purchaseReturn, approvalPending: true, approvalSteps: approval.steps };
    }

    const updated = await this.purchaseReturnRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedBy: { connect: { id: data.approvedById } },
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_return',
      entityId: id,
      newValues: { status: 'APPROVED' },
      context,
    });
    return updated;
  }

  async reject(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const purchaseReturn = await assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
    PurchaseStatusEngine.assertPurchaseReturnTransition(purchaseReturn.status, 'REJECTED');
    await this.purchaseApprovalService.reject(tenantId, 'PURCHASE_RETURN', id, input, context, {
      amount: Number(purchaseReturn.totalAmount),
      branchId: purchaseReturn.branchId,
    });
    const updated = await this.purchaseReturnRepository.update(tenantId, id, {
      status: 'REJECTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_return',
      entityId: id,
      newValues: { status: 'REJECTED' },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const purchaseReturn = await assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
    PurchaseStatusEngine.assertPurchaseReturnTransition(purchaseReturn.status, 'CANCELLED');
    const updated = await this.purchaseReturnRepository.update(tenantId, id, {
      status: 'CANCELLED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_return',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }

  async complete(tenantId: string, id: string, context?: AuditContext) {
    const purchaseReturn = await assertFound(
      this.purchaseReturnRepository.findById(tenantId, id),
      'Purchase return not found',
    );
    PurchaseStatusEngine.assertPurchaseReturnTransition(purchaseReturn.status, 'COMPLETED');

    for (const line of purchaseReturn.lines) {
      if (line.inventoryItemId) {
        await this.movementEngine.record({
          tenantId,
          branchId: purchaseReturn.branchId,
          inventoryItemId: line.inventoryItemId,
          type: 'RETURN',
          quantity: line.quantity,
          referenceType: 'purchase_return',
          referenceId: purchaseReturn.id,
          reason: 'Supplier return',
          auditContext: context,
        });

        await this.lifecycleEngine.transition({
          tenantId,
          inventoryItemId: line.inventoryItemId,
          toStage: 'ARCHIVED',
          reason: `Supplier return ${purchaseReturn.returnNo}`,
          branchId: purchaseReturn.branchId,
          skipLockCheck: true,
        });
      }
    }

    await this.purchasingIntegrationService.postPurchaseReturnAccounting(
      tenantId,
      {
        purchaseReturnId: purchaseReturn.id,
        supplierId: purchaseReturn.supplierId,
        branchId: purchaseReturn.branchId,
        totalAmount: Number(purchaseReturn.totalAmount),
        entryDate: purchaseReturn.returnDate,
      },
      context,
    );

    const updated = await this.purchaseReturnRepository.update(tenantId, id, {
      status: 'COMPLETED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_return',
      entityId: id,
      newValues: { status: 'COMPLETED' },
      context,
    });
    return updated;
  }
}
