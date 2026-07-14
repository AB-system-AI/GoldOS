import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';

import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import { calculatePurchaseTotals } from '../engines/purchase-calculation.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PurchaseRequestRepository } from '../repositories/purchase-request.repository.js';
import type { PurchaseApprovalService } from './purchase-approval.service.js';

const lineSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  estimatedUnitCost: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const approveSchema = z.object({
  approverId: z.string().uuid(),
});

const createSchema = z.object({
  branchId: z.string().uuid(),
  requestedById: z.string().uuid().optional().nullable(),
  neededByDate: z.coerce.date().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

export class PurchaseRequestService {
  constructor(
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly purchaseApprovalService: PurchaseApprovalService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
  }

  list(tenantId: string, filters?: Parameters<PurchaseRequestRepository['list']>[1]) {
    return this.purchaseRequestRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const totals = calculatePurchaseTotals(
      data.lines.map((line) => ({
        quantity: line.quantity ?? 1,
        unitCost: line.estimatedUnitCost ?? 0,
      })),
    );
    const requestNo = await this.documentNumberGenerator.next(tenantId, 'PR', {
      branchId: data.branchId,
    });

    const request = await this.purchaseRequestRepository.create(tenantId, {
      requestNo,
      status: 'DRAFT',
      estimatedTotal: totals.total,
      currency: data.currency ?? 'SAR',
      neededByDate: data.neededByDate ?? null,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      ...(data.requestedById ? { requestedBy: { connect: { id: data.requestedById } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      const unitCost = line.estimatedUnitCost ?? 0;
      await this.purchaseRequestRepository.createLine(request.id, {
        lineNo: index + 1,
        description: line.description ?? null,
        quantity,
        estimatedUnitCost: unitCost,
        estimatedTotal: quantity * unitCost,
        notes: line.notes ?? null,
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_request',
      entityId: request.id,
      newValues: request,
      context,
    });

    return this.getById(tenantId, request.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const request = await assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
    PurchaseStatusEngine.assertPurchaseRequestTransition(request.status, 'SUBMITTED');
    await this.purchaseApprovalService.initiateApproval(
      tenantId,
      {
        documentType: 'PURCHASE_REQUEST',
        documentId: id,
        amount: Number(request.estimatedTotal),
        branchId: request.branchId,
      },
      context,
    );
    const updated = await this.purchaseRequestRepository.update(tenantId, id, {
      status: 'SUBMITTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_request',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const data = parseInput(approveSchema, input);
    const request = await assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
    PurchaseStatusEngine.assertPurchaseRequestTransition(request.status, 'APPROVED');

    const approval = await this.purchaseApprovalService.approveDocument(
      tenantId,
      {
        documentType: 'PURCHASE_REQUEST',
        documentId: id,
        amount: Number(request.estimatedTotal),
        branchId: request.branchId,
      },
      data,
      context,
    );
    if (!approval.fullyApproved) {
      return { ...request, approvalPending: true, approvalSteps: approval.steps };
    }

    const updated = await this.purchaseRequestRepository.update(tenantId, id, {
      status: 'APPROVED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_request',
      entityId: id,
      newValues: { status: 'APPROVED' },
      context,
    });
    return updated;
  }

  async reject(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const request = await assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
    PurchaseStatusEngine.assertPurchaseRequestTransition(request.status, 'REJECTED');
    await this.purchaseApprovalService.reject(tenantId, 'PURCHASE_REQUEST', id, input, context, {
      amount: Number(request.estimatedTotal),
      branchId: request.branchId,
    });
    const updated = await this.purchaseRequestRepository.update(tenantId, id, {
      status: 'REJECTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_request',
      entityId: id,
      newValues: { status: 'REJECTED' },
      context,
    });
    return updated;
  }

  async markConverted(tenantId: string, id: string, context?: AuditContext) {
    const request = await assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
    PurchaseStatusEngine.assertPurchaseRequestTransition(request.status, 'CONVERTED');
    const updated = await this.purchaseRequestRepository.update(tenantId, id, {
      status: 'CONVERTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_request',
      entityId: id,
      newValues: { status: 'CONVERTED' },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const request = await assertFound(
      this.purchaseRequestRepository.findById(tenantId, id),
      'Purchase request not found',
    );
    PurchaseStatusEngine.assertPurchaseRequestTransition(request.status, 'CANCELLED');
    const updated = await this.purchaseRequestRepository.update(tenantId, id, {
      status: 'CANCELLED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_request',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }
}
