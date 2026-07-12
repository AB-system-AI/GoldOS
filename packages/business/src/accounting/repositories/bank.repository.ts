import type { BankTransactionType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, tenantScope } from '../../repositories/tenant-scope.js';

export class BankTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.bankTransaction.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { bank: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      bankId?: string;
      transactionType?: BankTransactionType;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.bankTransaction.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.bankId ? { bankId: filters.bankId } : {}),
        ...(filters?.transactionType ? { transactionType: filters.transactionType } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.BankTransactionCreateInput, 'tenant'>) {
    return this.prisma.bankTransaction.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.BankTransactionUpdateInput) {
    const result = await this.prisma.bankTransaction.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}

export class BankReconciliationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(tenantId: string, filters?: { bankId?: string; skip?: number; take?: number }) {
    return this.prisma.bankReconciliation.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.bankId ? { bankId: filters.bankId } : {}),
      },
      orderBy: { periodEnd: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.BankReconciliationCreateInput, 'tenant'>) {
    return this.prisma.bankReconciliation.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
