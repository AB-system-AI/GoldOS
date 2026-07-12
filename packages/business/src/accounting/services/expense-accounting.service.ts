import { z } from 'zod';
import type { PrismaClient } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { buildExpenseRule } from '../engines/accounting-rule.engine.js';
import type {
  ExpenseCategoryRepository,
  ExpenseRepository,
} from '../repositories/expense.repository.js';
import type { AccountingPostingService } from './accounting-posting.service.js';
import { logAccountingAudit } from './audit.helper.js';

const createExpenseSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  expenseNo: z.string().min(2).max(30),
  category: z.string().min(1).max(50),
  amount: z.number().positive(),
  currency: z.string().length(3).default('SAR'),
  description: z.string().min(1),
  expenseDate: z.coerce.date(),
  paymentMethod: z
    .enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_WALLET', 'OTHER'])
    .optional()
    .nullable(),
});

const approveSchema = z.object({
  expenseAccountCode: z.string().optional(),
});

export class ExpenseAccountingService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly expenseRepository: ExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly postingService: AccountingPostingService,
    private readonly auditService: AuditService,
  ) {}

  listCategories(tenantId: string) {
    return this.categoryRepository.list(tenantId);
  }

  listExpenses(tenantId: string, filters?: Parameters<ExpenseRepository['list']>[1]) {
    return this.expenseRepository.list(tenantId, filters);
  }

  async createExpense(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createExpenseSchema, input);
    const expense = await this.expenseRepository.create(tenantId, {
      expenseNo: data.expenseNo,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      expenseDate: data.expenseDate,
      status: 'DRAFT',
      ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
      ...(data.categoryId ? { expenseCategory: { connect: { id: data.categoryId } } } : {}),
      ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'expense',
      entityId: expense.id,
      newValues: expense,
      context,
    });

    return expense;
  }

  async approveAndPost(
    tenantId: string,
    expenseId: string,
    input: unknown,
    context?: AuditContext,
  ) {
    const expense = await assertFound(
      this.expenseRepository.findById(tenantId, expenseId),
      'Expense not found',
    );

    if (expense.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft expenses can be approved');
    }

    const data = parseInput(approveSchema, input);
    const rule = buildExpenseRule({
      amount: Number(expense.amount),
      expenseAccountCode: data.expenseAccountCode,
    });

    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: expense.branchId,
        entryDate: expense.expenseDate,
        referenceType: 'EXPENSE',
        referenceId: expense.id,
        rule,
      },
      context,
    );

    const updated = await this.expenseRepository.update(tenantId, expenseId, {
      status: 'PAID',
      approvedAt: new Date(),
      journalEntry: { connect: { id: journal.id } },
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'APPROVE',
      entityType: 'expense',
      entityId: expenseId,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'PAID', journalId: journal.id },
      context,
    });

    return updated;
  }
}
