import type { AccountingReferenceType } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext } from '../../services/audit.service.js';
import type {
  AccountingRuleLine,
  AccountingRuleResult,
} from '../engines/accounting-rule.engine.js';
import type { ChartOfAccountRepository } from '../repositories/chart-of-account.repository.js';
import type { AccountingTransactionRepository } from '../repositories/account-balance.repository.js';
import type { JournalService } from './journal.service.js';

export class AccountingPostingService {
  constructor(
    private readonly chartRepository: ChartOfAccountRepository,
    private readonly transactionRepository: AccountingTransactionRepository,
    private readonly journalService: JournalService,
  ) {}

  async postFromRule(
    tenantId: string,
    params: {
      branchId?: string | null;
      entryDate: Date;
      referenceType: AccountingReferenceType;
      referenceId: string;
      rule: AccountingRuleResult;
      customerId?: string | null;
      supplierId?: string | null;
      autoPost?: boolean;
    },
    context?: AuditContext,
  ) {
    const existing = await this.transactionRepository.findByReference(
      tenantId,
      params.referenceType,
      params.referenceId,
    );
    if (existing && existing.status !== 'REVERSED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Accounting entry already exists for reference',
      );
    }

    const lines = await this.resolveRuleLines(tenantId, params.rule.lines);

    const journal = await this.journalService.createDraft(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        description: params.rule.description,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          description: line.description,
          customerId: params.customerId,
          supplierId: params.supplierId,
        })),
      },
      context,
    );

    if (params.autoPost !== false) {
      return this.journalService.post(tenantId, journal.id, context);
    }

    return journal;
  }

  private async resolveRuleLines(tenantId: string, ruleLines: AccountingRuleLine[]) {
    const resolved = [];
    for (const line of ruleLines) {
      const account = await this.chartRepository.findByCode(tenantId, line.accountCode);
      if (!account) {
        throw new BusinessError(
          BusinessErrorCodes.NOT_FOUND,
          `Account code ${line.accountCode} not found`,
        );
      }
      resolved.push({
        accountId: account.id,
        debit: line.debit,
        credit: line.credit,
        description: line.description,
      });
    }
    return resolved;
  }
}
