import type { Prisma, PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class AccountBalanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByAccount(
    tenantId: string,
    accountId: string,
    filters?: { branchId?: string | null; periodId?: string | null; currency?: string },
  ) {
    return this.prisma.accountBalance.findFirst({
      where: {
        ...tenantScope(tenantId),
        accountId,
        branchId: filters?.branchId ?? null,
        periodId: filters?.periodId ?? null,
        ...(filters?.currency ? { currency: filters.currency } : {}),
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      accountId?: string;
      branchId?: string;
      periodId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.accountBalance.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.accountId ? { accountId: filters.accountId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.periodId ? { periodId: filters.periodId } : {}),
      },
      include: { account: true },
      orderBy: { account: { code: 'asc' } },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  async upsert(
    tenantId: string,
    data: {
      accountId: string;
      branchId?: string | null;
      periodId?: string | null;
      currency: string;
      debitTotal: number;
      creditTotal: number;
      balance: number;
      asOfDate: Date;
    },
  ) {
    const branchId = data.branchId ?? null;
    const periodId = data.periodId ?? null;

    const existing = await this.prisma.accountBalance.findFirst({
      where: {
        ...tenantScope(tenantId),
        accountId: data.accountId,
        branchId,
        periodId,
        currency: data.currency,
      },
    });

    if (existing) {
      return this.prisma.accountBalance.update({
        where: { id: existing.id },
        data: {
          debitTotal: data.debitTotal,
          creditTotal: data.creditTotal,
          balance: data.balance,
          asOfDate: data.asOfDate,
        },
      });
    }

    return this.prisma.accountBalance.create({
      data: {
        tenant: { connect: { id: tenantId } },
        account: { connect: { id: data.accountId } },
        ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
        ...(data.periodId ? { period: { connect: { id: data.periodId } } } : {}),
        currency: data.currency,
        debitTotal: data.debitTotal,
        creditTotal: data.creditTotal,
        balance: data.balance,
        asOfDate: data.asOfDate,
      },
    });
  }
}

export class AccountingTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByReference(tenantId: string, referenceType: string, referenceId: string) {
    return this.prisma.accountingTransaction.findFirst({
      where: { ...tenantScope(tenantId), referenceType, referenceId },
      include: { journalEntry: { include: { lines: true } } },
    });
  }

  create(tenantId: string, data: Omit<Prisma.AccountingTransactionCreateInput, 'tenant'>) {
    return this.prisma.accountingTransaction.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
