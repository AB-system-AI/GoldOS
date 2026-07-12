import type { Prisma, PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class LoyaltyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByCustomer(tenantId: string, customerId: string) {
    return this.prisma.loyaltyAccount.findFirst({
      where: { customerId, ...tenantScope(tenantId) },
      include: {
        transactions: { orderBy: { occurredAt: 'desc' }, take: 20 },
      },
    });
  }

  ensureAccount(tenantId: string, customerId: string) {
    return this.prisma.loyaltyAccount.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      create: { tenant: { connect: { id: tenantId } }, customer: { connect: { id: customerId } } },
      update: {},
    });
  }

  createTransaction(tenantId: string, data: Omit<Prisma.LoyaltyTransactionCreateInput, 'tenant'>) {
    return this.prisma.loyaltyTransaction.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async adjustPoints(
    tenantId: string,
    loyaltyAccountId: string,
    pointsDelta: number,
    type: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'REVERSE',
    reference?: { type: string; id: string },
    reason?: string,
    options?: { expiresAt?: Date; multiplier?: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loyaltyAccount.findFirst({
        where: { id: loyaltyAccountId, tenantId, deletedAt: null },
      });
      if (!account) return null;

      const newBalance = Number(account.pointsBalance) + pointsDelta;
      await tx.loyaltyAccount.update({
        where: { id: loyaltyAccountId },
        data: {
          pointsBalance: newBalance,
          ...(pointsDelta > 0 && type === 'EARN'
            ? { lifetimePoints: { increment: pointsDelta } }
            : {}),
        },
      });

      return tx.loyaltyTransaction.create({
        data: {
          tenant: { connect: { id: tenantId } },
          loyaltyAccount: { connect: { id: loyaltyAccountId } },
          type,
          points: pointsDelta,
          referenceType: reference?.type ?? null,
          referenceId: reference?.id ?? null,
          reason: reason ?? null,
          expiresAt: options?.expiresAt ?? null,
          multiplier: options?.multiplier ?? 1,
        },
      });
    });
  }

  getProgramRule(tenantId: string) {
    return this.prisma.loyaltyProgramRule.findUnique({ where: { tenantId } });
  }

  upsertProgramRule(tenantId: string, data: Omit<Prisma.LoyaltyProgramRuleCreateInput, 'tenant'>) {
    return this.prisma.loyaltyProgramRule.upsert({
      where: { tenantId },
      create: { ...data, tenant: { connect: { id: tenantId } } },
      update: data,
    });
  }

  listTransactions(tenantId: string, loyaltyAccountId: string, take = 50) {
    return this.prisma.loyaltyTransaction.findMany({
      where: { tenantId, loyaltyAccountId },
      orderBy: { occurredAt: 'desc' },
      take,
    });
  }
}
