import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertTenantRef, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { PurchaseDocumentType } from '@goldos/database';

import { canAutoApprove, resolveApprovalSteps } from '../engines/approval.engine.js';
import type { PurchaseApprovalRepository } from '../repositories/purchase-approval.repository.js';

const approveSchema = z.object({
  approverId: z.string().uuid(),
  comments: z.string().optional().nullable(),
});

const rejectSchema = z.object({
  approverId: z.string().uuid(),
  comments: z.string().min(1),
});

export class PurchaseApprovalService {
  constructor(
    private readonly purchaseApprovalRepository: PurchaseApprovalRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  listHistory(tenantId: string, documentType: PurchaseDocumentType, documentId: string) {
    return this.purchaseApprovalRepository.listForDocument(tenantId, documentType, documentId);
  }

  listPending(
    tenantId: string,
    filters?: Parameters<PurchaseApprovalRepository['listPending']>[1],
  ) {
    return this.purchaseApprovalRepository.listPending(tenantId, filters);
  }

  async isFullyApproved(tenantId: string, documentType: PurchaseDocumentType, documentId: string) {
    const approvals = await this.purchaseApprovalRepository.listForDocument(
      tenantId,
      documentType,
      documentId,
    );
    if (approvals.length === 0) return false;
    return approvals.every((row) => row.status === 'APPROVED' || row.status === 'SKIPPED');
  }

  async initiateApproval(
    tenantId: string,
    params: {
      documentType: PurchaseDocumentType;
      documentId: string;
      amount: number;
      branchId?: string | null;
    },
    context?: AuditContext,
  ) {
    const configs = await this.purchaseApprovalRepository.listConfigs(tenantId, params.branchId);
    const mapped = configs.map((row) => ({
      level: row.level,
      minAmount: Number(row.minAmount),
      maxAmount: row.maxAmount !== null ? Number(row.maxAmount) : null,
      autoApproveBelow: row.autoApproveBelow !== null ? Number(row.autoApproveBelow) : null,
    }));

    if (canAutoApprove(params.amount, mapped)) {
      const step = await this.purchaseApprovalRepository.create(tenantId, {
        documentType: params.documentType,
        documentId: params.documentId,
        level: 'AUTO',
        status: 'APPROVED',
        amount: params.amount,
        decidedAt: new Date(),
        comments: 'Auto-approved',
      });
      await this.auditService.log({
        tenantId,
        action: 'CREATE',
        entityType: 'purchase_approval',
        entityId: step.id,
        newValues: step,
        context,
      });
      return { approved: true, steps: [step] };
    }

    const steps = resolveApprovalSteps(params.amount, mapped);
    const created = [];
    for (const step of steps) {
      const row = await this.purchaseApprovalRepository.create(tenantId, {
        documentType: params.documentType,
        documentId: params.documentId,
        level: step.level,
        status: step.autoApprove ? 'APPROVED' : 'PENDING',
        amount: params.amount,
        decidedAt: step.autoApprove ? new Date() : null,
        comments: step.autoApprove ? 'Auto-approved threshold' : null,
      });
      created.push(row);
    }

    const allApproved = created.every((row) => row.status === 'APPROVED');
    return { approved: allApproved, steps: created };
  }

  async approveDocument(
    tenantId: string,
    params: {
      documentType: PurchaseDocumentType;
      documentId: string;
      amount: number;
      branchId?: string | null;
    },
    input: unknown,
    context?: AuditContext,
  ) {
    const data = parseInput(approveSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasEmployee(tenantId, data.approverId),
      'Approver not found in tenant',
    );

    let approvals = await this.purchaseApprovalRepository.listForDocument(
      tenantId,
      params.documentType,
      params.documentId,
    );

    if (approvals.length === 0) {
      const initiated = await this.initiateApproval(tenantId, params, context);
      if (initiated.approved) {
        return { fullyApproved: true, step: initiated.steps[0], steps: initiated.steps };
      }
      approvals = await this.purchaseApprovalRepository.listForDocument(
        tenantId,
        params.documentType,
        params.documentId,
      );
    }

    const pending = approvals.find((row) => row.status === 'PENDING');
    if (!pending) {
      const fullyApproved = approvals.every(
        (row) => row.status === 'APPROVED' || row.status === 'SKIPPED',
      );
      if (fullyApproved) {
        return { fullyApproved: true, steps: approvals };
      }
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'No pending approval step found');
    }

    const updated = await this.purchaseApprovalRepository.update(pending.id, {
      status: 'APPROVED',
      approver: { connect: { id: data.approverId } },
      comments: data.comments ?? null,
      decidedAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_approval',
      entityId: pending.id,
      newValues: updated,
      context,
    });

    const refreshed = await this.purchaseApprovalRepository.listForDocument(
      tenantId,
      params.documentType,
      params.documentId,
    );
    const fullyApproved = refreshed.every(
      (row) => row.status === 'APPROVED' || row.status === 'SKIPPED',
    );

    return { fullyApproved, step: updated, steps: refreshed };
  }

  async reject(
    tenantId: string,
    documentType: PurchaseDocumentType,
    documentId: string,
    input: unknown,
    context?: AuditContext,
    options?: { amount?: number; branchId?: string | null },
  ) {
    const data = parseInput(rejectSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasEmployee(tenantId, data.approverId),
      'Approver not found in tenant',
    );

    let approvals = await this.purchaseApprovalRepository.listForDocument(
      tenantId,
      documentType,
      documentId,
    );

    if (approvals.length === 0 && options?.amount !== undefined) {
      await this.initiateApproval(
        tenantId,
        {
          documentType,
          documentId,
          amount: options.amount,
          branchId: options.branchId,
        },
        context,
      );
      approvals = await this.purchaseApprovalRepository.listForDocument(
        tenantId,
        documentType,
        documentId,
      );
    }

    const pending = approvals.find((row) => row.status === 'PENDING');
    if (pending) {
      const updated = await this.purchaseApprovalRepository.update(pending.id, {
        status: 'REJECTED',
        approver: { connect: { id: data.approverId } },
        comments: data.comments,
        decidedAt: new Date(),
      });

      await this.purchaseApprovalRepository.skipRemainingPending(
        tenantId,
        documentType,
        documentId,
        pending.id,
      );

      await this.auditService.log({
        tenantId,
        action: 'UPDATE',
        entityType: 'purchase_approval',
        entityId: pending.id,
        newValues: updated,
        context,
      });

      return updated;
    }

    const hasApproved = approvals.some((row) => row.status === 'APPROVED');
    if (hasApproved || approvals.length === 0) {
      const rejection = await this.purchaseApprovalRepository.create(tenantId, {
        documentType,
        documentId,
        level: 'BRANCH_MANAGER',
        status: 'REJECTED',
        amount: options?.amount ?? 0,
        approver: { connect: { id: data.approverId } },
        comments: data.comments,
        decidedAt: new Date(),
      });

      await this.auditService.log({
        tenantId,
        action: 'CREATE',
        entityType: 'purchase_approval',
        entityId: rejection.id,
        newValues: rejection,
        context,
      });

      return rejection;
    }

    throw new BusinessError(BusinessErrorCodes.CONFLICT, 'No pending approval step found');
  }
}
