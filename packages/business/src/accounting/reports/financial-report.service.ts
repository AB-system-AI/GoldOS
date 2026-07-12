import type { AccountType } from '@goldos/database';

import type { AccountBalanceRepository } from '../repositories/account-balance.repository.js';
import type { ChartOfAccountRepository } from '../repositories/chart-of-account.repository.js';
import type { JournalEntryRepository } from '../repositories/journal-entry.repository.js';

export class FinancialReportService {
  constructor(
    private readonly balanceRepository: AccountBalanceRepository,
    private readonly chartRepository: ChartOfAccountRepository,
    private readonly journalRepository: JournalEntryRepository,
  ) {}

  async trialBalance(tenantId: string, filters?: { branchId?: string; periodId?: string }) {
    const balances = await this.balanceRepository.list(tenantId, filters);
    const totalDebit = balances.reduce((sum, b) => sum + Number(b.debitTotal), 0);
    const totalCredit = balances.reduce((sum, b) => sum + Number(b.creditTotal), 0);

    return {
      accounts: balances.map((b) => ({
        accountId: b.accountId,
        code: b.account.code,
        name: b.account.name,
        accountType: b.account.accountType,
        debit: Number(b.debitTotal),
        credit: Number(b.creditTotal),
        balance: Number(b.balance),
      })),
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
    };
  }

  async balanceSheet(tenantId: string, filters?: { branchId?: string; periodId?: string }) {
    const balances = await this.balanceRepository.list(tenantId, filters);
    const group = (types: AccountType[]) =>
      balances
        .filter((b) => types.includes(b.account.accountType))
        .map((b) => ({
          code: b.account.code,
          name: b.account.name,
          balance: Number(b.balance),
        }));

    const assets = group(['ASSET']);
    const liabilities = group(['LIABILITY']);
    const equity = group(['EQUITY']);

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((s, a) => s + a.balance, 0),
      totalLiabilities: liabilities.reduce((s, a) => s + a.balance, 0),
      totalEquity: equity.reduce((s, a) => s + a.balance, 0),
    };
  }

  async incomeStatement(tenantId: string, filters?: { branchId?: string; periodId?: string }) {
    const balances = await this.balanceRepository.list(tenantId, filters);
    const revenue = balances
      .filter((b) => b.account.accountType === 'REVENUE')
      .reduce((s, b) => s + Number(b.balance), 0);
    const cogs = balances
      .filter((b) => b.account.accountType === 'COGS')
      .reduce((s, b) => s + Number(b.balance), 0);
    const expenses = balances
      .filter((b) => b.account.accountType === 'EXPENSE')
      .reduce((s, b) => s + Number(b.balance), 0);

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    return { revenue, cogs, grossProfit, expenses, netIncome };
  }

  async generalLedger(
    tenantId: string,
    accountId: string,
    filters?: { fromDate?: Date; toDate?: Date },
  ) {
    const account = await this.chartRepository.findById(tenantId, accountId);
    const journals = await this.journalRepository.list(tenantId, {
      status: 'POSTED',
      fromDate: filters?.fromDate,
      toDate: filters?.toDate,
      take: 500,
    });

    const lines = journals.flatMap((j) =>
      j.lines
        .filter((l) => l.accountId === accountId)
        .map((l) => ({
          journalId: j.id,
          journalNo: j.journalNo,
          entryDate: j.entryDate,
          description: l.description ?? j.description,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
    );

    return { account, lines };
  }

  async accountStatement(tenantId: string, accountId: string) {
    const balance = await this.balanceRepository.findByAccount(tenantId, accountId);
    const ledger = await this.generalLedger(tenantId, accountId);
    return { balance, ...ledger };
  }

  async cashFlowStatement(tenantId: string, filters?: { branchId?: string; periodId?: string }) {
    const balances = await this.balanceRepository.list(tenantId, filters);
    const sumByCodes = (codes: string[]) =>
      balances
        .filter((b) => codes.includes(b.account.code))
        .reduce((s, b) => s + Number(b.balance), 0);

    const operating = {
      netIncome: balances
        .filter((b) => ['REVENUE', 'COGS', 'EXPENSE'].includes(b.account.accountType))
        .reduce(
          (s, b) =>
            s + (b.account.accountType === 'REVENUE' ? Number(b.balance) : -Number(b.balance)),
          0,
        ),
      workingCapitalChange: sumByCodes(['1200', '2100']),
    };

    const investing = {
      inventoryChange: sumByCodes(['1300', '1310', '1320']),
      goldRevaluation: sumByCodes(['4200', '5200']),
    };

    const financing = {
      equityChange: sumByCodes(['3100']),
      payablesChange: sumByCodes(['2100']),
    };

    const netCashFlow =
      operating.netIncome -
      operating.workingCapitalChange -
      investing.inventoryChange +
      financing.equityChange;

    return {
      operating: { ...operating, subtotal: operating.netIncome - operating.workingCapitalChange },
      investing: { ...investing, subtotal: -investing.inventoryChange + investing.goldRevaluation },
      financing: { ...financing, subtotal: financing.equityChange + financing.payablesChange },
      netCashFlow,
    };
  }
}
