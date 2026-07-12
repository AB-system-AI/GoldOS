import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import { calculateDiscount } from '../engines/discount.engine.js';
import type { DiscountApprovalRepository } from '../repositories/discount-approval.repository.js';
import type { SalesNotificationService } from './sales-notification.service.js';

const requestSchema = z.object({
  branchId: z.string().uuid(),
  referenceType: z.string().min(1),
  referenceId: z.string().uuid(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  requestedValue: z.number().min(0),
  subtotal: z.number().min(0),
  maxEmployeePercent: z.number().min(0).optional(),
  requestedById: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable(),
});

const approveSchema = z.object({
  approvedById: z.string().uuid(),
  approvedValue: z.number().min(0).optional(),
});

const rejectSchema = z.object({
  approvedById: z.string().uuid(),
  rejectionReason: z.string().min(1),
});

export class DiscountApprovalService {
  constructor(
    private readonly discountApprovalRepository: DiscountApprovalRepository,
    private readonly salesNotificationService: SalesNotificationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.discountApprovalRepository.findById(tenantId, id),
      'Discount approval not found',
    );
  }

  list(tenantId: string, filters?: Parameters<DiscountApprovalRepository['list']>[1]) {
    return this.discountApprovalRepository.list(tenantId, filters);
  }

  async evaluateAndEnforce(
    tenantId: string,
    input: {
      branchId: string;
      referenceType: string;
      referenceId: string;
      discountType: 'PERCENTAGE' | 'FIXED';
      requestedValue: number;
      subtotal: number;
      maxEmployeePercent?: number;
      requestedById?: string | null;
      reason?: string | null;
    },
    context?: AuditContext,
  ) {
    const result = calculateDiscount({
      type: input.discountType,
      value: input.requestedValue,
      subtotal: input.subtotal,
      maxEmployeePercent: input.maxEmployeePercent,
    });

    if (!result.requiresApproval) {
      return { approved: true, autoApproved: true, discount: result };
    }

    const existing = await this.discountApprovalRepository.findPendingByReference(
      tenantId,
      input.referenceType,
      input.referenceId,
    );
    if (existing) {
      return {
        approved: false,
        autoApproved: false,
        pendingApprovalId: existing.id,
        discount: result,
      };
    }

    const approval = await this.discountApprovalRepository.create(tenantId, {
      discountType: input.discountType,
      requestedValue: input.requestedValue,
      status: 'PENDING',
      reason: input.reason ?? null,
      branch: { connect: { id: input.branchId } },
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      ...(input.requestedById ? { requester: { connect: { id: input.requestedById } } } : {}),
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: input.branchId,
      eventType: 'DISCOUNT_PENDING',
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      title: 'Discount approval required',
      body: `Discount of ${String(result.effectivePercent)}% requires manager approval`,
      payload: { approvalId: approval.id, effectivePercent: result.effectivePercent },
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'discount_approval',
      entityId: approval.id,
      newValues: approval,
      context,
    });

    return {
      approved: false,
      autoApproved: false,
      pendingApprovalId: approval.id,
      discount: result,
    };
  }

  async request(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(requestSchema, input);
    return this.evaluateAndEnforce(tenantId, data, context);
  }

  async approve(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.discountApprovalRepository.findById(tenantId, id),
      'Discount approval not found',
    );
    if (existing.status !== 'PENDING') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Approval is not pending');
    }

    const data = parseInput(approveSchema, input);
    const updated = await this.discountApprovalRepository.update(tenantId, id, {
      status: 'APPROVED',
      approvedValue: data.approvedValue ?? existing.requestedValue,
      approvedAt: new Date(),
      approver: { connect: { id: data.approvedById } },
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: existing.branchId,
      eventType: 'DISCOUNT_APPROVED',
      referenceType: existing.referenceType,
      referenceId: existing.referenceId,
      title: 'Discount approved',
      body: 'Manager approved the discount request',
      payload: { approvalId: id },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'discount_approval',
      entityId: id,
      newValues: { action: 'approve' },
      context,
    });

    return updated;
  }

  async reject(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.discountApprovalRepository.findById(tenantId, id),
      'Discount approval not found',
    );
    if (existing.status !== 'PENDING') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Approval is not pending');
    }

    const data = parseInput(rejectSchema, input);
    const updated = await this.discountApprovalRepository.update(tenantId, id, {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: data.rejectionReason,
      approver: { connect: { id: data.approvedById } },
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: existing.branchId,
      eventType: 'DISCOUNT_REJECTED',
      referenceType: existing.referenceType,
      referenceId: existing.referenceId,
      title: 'Discount rejected',
      body: data.rejectionReason,
      payload: { approvalId: id },
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'discount_approval',
      entityId: id,
      newValues: { action: 'reject', reason: data.rejectionReason },
      context,
    });

    return updated;
  }

  async isCheckoutBlocked(tenantId: string, referenceType: string, referenceId: string) {
    const pending = await this.discountApprovalRepository.findPendingByReference(
      tenantId,
      referenceType,
      referenceId,
    );
    return Boolean(pending);
  }
}
