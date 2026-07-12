import { z } from 'zod';
import type { PrismaClient } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { applyLineToBalance } from '../engines/balance.engine.js';
import { assertPeriodOpen } from '../engines/financial-period.engine.js';
import {
  assertBalancedJournal,
  buildReversalLines,
  validateJournalBalance,
} from '../engines/journal.engine.js';
import type {
  AccountBalanceRepository,
  AccountingTransactionRepository,
} from '../repositories/account-balance.repository.js';
import type { ChartOfAccountRepository } from '../repositories/chart-of-account.repository.js';
import type { AccountingPeriodRepository } from '../repositories/fiscal-period.repository.js';
import type { JournalEntryRepository } from '../repositories/journal-entry.repository.js';
import { logAccountingAudit } from './audit.helper.js';

const lineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  entryDate: z.coerce.date(),
  description: z.string().min(1),
  currency: z.string().length(3).default('SAR'),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
  lines: z.array(lineSchema).min(2),
});

export class JournalService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly journalRepository: JournalEntryRepository,
    private readonly chartRepository: ChartOfAccountRepository,
    private readonly balanceRepository: AccountBalanceRepository,
    private readonly transactionRepository: AccountingTransactionRepository,
    private readonly periodRepository: AccountingPeriodRepository,
    private readonly auditService: AuditService,
  ) {}

  list(tenantId: string, filters?: Parameters<JournalEntryRepository['list']>[1]) {
    return this.journalRepository.list(tenantId, filters);
  }

  getById(tenantId: string, id: string) {
    return this.journalRepository.findById(tenantId, id);
  }

  async createDraft(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    const validation = validateJournalBalance(data.lines);
    if (!validation.valid) {
      throw new BusinessError(BusinessErrorCodes.VALIDATION_ERROR, validation.errors.join('; '));
    }

    const period = await this.periodRepository.findOpenForDate(tenantId, data.entryDate);
    if (period) {
      assertPeriodOpen(period.status);
    }

    const journalNo = `JE-${Date.now().toString(36).toUpperCase()}`;

    const journal = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenant: { connect: { id: tenantId } },
          journalNo,
          entryDate: data.entryDate,
          status: 'DRAFT',
          currency: data.currency,
          description: data.description,
          totalDebit: validation.totalDebit,
          totalCredit: validation.totalCredit,
          ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
          ...(period ? { period: { connect: { id: period.id } } } : {}),
          ...(data.referenceType ? { referenceType: data.referenceType as never } : {}),
          ...(data.referenceId ? { referenceId: data.referenceId } : {}),
          lines: {
            create: data.lines.map((line, index) => ({
              lineNo: index + 1,
              account: { connect: { id: line.accountId } },
              debit: line.debit,
              credit: line.credit,
              currency: data.currency,
              description: line.description,
              ...(line.customerId ? { customer: { connect: { id: line.customerId } } } : {}),
              ...(line.supplierId ? { supplier: { connect: { id: line.supplierId } } } : {}),
            })),
          },
        },
        include: { lines: true },
      });

      if (data.referenceType && data.referenceId) {
        await tx.accountingTransaction.create({
          data: {
            tenant: { connect: { id: tenantId } },
            transactionType: data.referenceType as never,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            journalEntry: { connect: { id: entry.id } },
            status: 'DRAFT',
          },
        });
      }

      return entry;
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'journal_entry',
      entityId: journal.id,
      newValues: journal,
      context,
    });

    return journal;
  }

  async post(tenantId: string, journalId: string, context?: AuditContext) {
    const journal = await assertFound(
      this.journalRepository.findById(tenantId, journalId),
      'Journal not found',
    );

    if (journal.status !== 'DRAFT') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only draft journals can be posted');
    }

    if (journal.period) {
      assertPeriodOpen(journal.period.status);
    }

    const lines = journal.lines.map((l) => ({
      accountId: l.accountId,
      debit: Number(l.debit),
      credit: Number(l.credit),
    }));
    assertBalancedJournal(lines);

    const posted = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.update({
        where: { id: journalId },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
        },
        include: { lines: { include: { account: true } } },
      });

      for (const line of entry.lines) {
        const existing = await tx.accountBalance.findFirst({
          where: {
            tenantId,
            accountId: line.accountId,
            branchId: entry.branchId,
            periodId: entry.periodId,
            currency: entry.currency,
          },
        });

        const totals = applyLineToBalance({
          normalBalance: line.account.normalBalance,
          currentDebit: existing ? Number(existing.debitTotal) : 0,
          currentCredit: existing ? Number(existing.creditTotal) : 0,
          lineDebit: Number(line.debit),
          lineCredit: Number(line.credit),
        });

        if (existing) {
          await tx.accountBalance.update({
            where: { id: existing.id },
            data: {
              debitTotal: totals.debitTotal,
              creditTotal: totals.creditTotal,
              balance: totals.balance,
              asOfDate: entry.entryDate,
            },
          });
        } else {
          await tx.accountBalance.create({
            data: {
              tenant: { connect: { id: tenantId } },
              account: { connect: { id: line.accountId } },
              ...(entry.branchId ? { branch: { connect: { id: entry.branchId } } } : {}),
              ...(entry.periodId ? { period: { connect: { id: entry.periodId } } } : {}),
              currency: entry.currency,
              debitTotal: totals.debitTotal,
              creditTotal: totals.creditTotal,
              balance: totals.balance,
              asOfDate: entry.entryDate,
            },
          });
        }
      }

      await tx.accountingTransaction.updateMany({
        where: { journalEntryId: journalId },
        data: { status: 'POSTED' },
      });

      return entry;
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'APPROVE',
      entityType: 'journal_entry',
      entityId: journalId,
      oldValues: { status: 'DRAFT' },
      newValues: { status: 'POSTED' },
      context,
    });

    return posted;
  }

  async reverse(tenantId: string, journalId: string, context?: AuditContext) {
    const original = await assertFound(
      this.journalRepository.findById(tenantId, journalId),
      'Journal not found',
    );

    if (original.status !== 'POSTED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Only posted journals can be reversed');
    }

    const reversalLines = buildReversalLines(
      original.lines.map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit),
        credit: Number(l.credit),
        description: l.description,
      })),
    );

    const reversal = await this.createDraft(
      tenantId,
      {
        branchId: original.branchId,
        entryDate: new Date(),
        description: `Reversal of ${original.journalNo}`,
        currency: original.currency,
        referenceType: original.referenceType,
        referenceId: original.referenceId,
        lines: reversalLines,
      },
      context,
    );

    await this.journalRepository.update(tenantId, reversal.id, {
      reversalOf: { connect: { id: journalId } },
    });

    const posted = await this.post(tenantId, reversal.id, context);

    await this.journalRepository.update(tenantId, journalId, {
      status: 'REVERSED',
      reversedAt: new Date(),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'VOID',
      entityType: 'journal_entry',
      entityId: journalId,
      oldValues: { status: 'POSTED' },
      newValues: { status: 'REVERSED', reversalId: posted.id },
      context,
    });

    return posted;
  }
}
