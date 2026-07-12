import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { parseInput } from '../../services/validation.js';
import type {
  BankReconciliationRepository,
  BankTransactionRepository,
} from '../repositories/bank.repository.js';
import { logAccountingAudit } from './audit.helper.js';
import type { OperationsAccountingIntegrationService } from './operations-integration.service.js';

const bankTransactionSchema = z.object({
  bankId: z.string().uuid(),
  transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  amount: z.number().positive(),
  currency: z.string().length(3).default('SAR'),
  description: z.string().min(1),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
  occurredAt: z.coerce.date().optional(),
});

const reconciliationSchema = z.object({
  bankId: z.string().uuid(),
  periodEnd: z.coerce.date(),
  statementBalance: z.number(),
  bookBalance: z.number(),
  notes: z.string().optional().nullable(),
});

export class BankAccountingService {
  constructor(
    private readonly bankTransactionRepository: BankTransactionRepository,
    private readonly reconciliationRepository: BankReconciliationRepository,
    private readonly auditService: AuditService,
    private readonly operationsAccountingIntegrationService?: OperationsAccountingIntegrationService,
  ) {}

  listTransactions(tenantId: string, filters?: Parameters<BankTransactionRepository['list']>[1]) {
    return this.bankTransactionRepository.list(tenantId, filters);
  }

  async createTransaction(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(bankTransactionSchema, input);
    const transactionNo = `BT-${Date.now().toString(36).toUpperCase()}`;

    const transaction = await this.bankTransactionRepository.create(tenantId, {
      transactionNo,
      transactionType: data.transactionType,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      occurredAt: data.occurredAt ?? new Date(),
      status: 'COMPLETED',
      bank: { connect: { id: data.bankId } },
      ...(data.referenceType ? { referenceType: data.referenceType } : {}),
      ...(data.referenceId ? { referenceId: data.referenceId } : {}),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'bank_transaction',
      entityId: transaction.id,
      newValues: transaction,
      context,
    });

    if (this.operationsAccountingIntegrationService) {
      await this.operationsAccountingIntegrationService.postBankTransaction(
        tenantId,
        {
          transactionId: transaction.id,
          amount: data.amount,
          transactionType: data.transactionType,
          entryDate: transaction.occurredAt,
        },
        context,
      );
    }

    return transaction;
  }

  listReconciliations(
    tenantId: string,
    filters?: Parameters<BankReconciliationRepository['list']>[1],
  ) {
    return this.reconciliationRepository.list(tenantId, filters);
  }

  async createReconciliation(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(reconciliationSchema, input);
    const difference = data.statementBalance - data.bookBalance;

    const reconciliation = await this.reconciliationRepository.create(tenantId, {
      periodEnd: data.periodEnd,
      statementBalance: data.statementBalance,
      bookBalance: data.bookBalance,
      difference,
      status: 'DRAFT',
      notes: data.notes,
      bank: { connect: { id: data.bankId } },
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'bank_reconciliation',
      entityId: reconciliation.id,
      newValues: reconciliation,
      context,
    });

    return reconciliation;
  }
}
