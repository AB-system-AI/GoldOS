import type { Prisma, PrismaClient } from '@goldos/database';

import { softDeleteData } from './tenant-scope.js';

export class ExchangeRateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string | null, id: string) {
    return this.prisma.exchangeRate.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
      },
      include: { currency: true, provider: true },
    });
  }

  findLatest(tenantId: string | null, currencyId: string, baseCurrency = 'SAR') {
    return this.prisma.exchangeRate.findFirst({
      where: {
        currencyId,
        baseCurrency,
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
      },
      orderBy: { effectiveAt: 'desc' },
      include: { currency: true },
    });
  }

  list(
    tenantId: string | null,
    filters?: { currencyId?: string; baseCurrency?: string; skip?: number; take?: number },
  ) {
    return this.prisma.exchangeRate.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
        ...(filters?.currencyId ? { currencyId: filters.currencyId } : {}),
        ...(filters?.baseCurrency ? { baseCurrency: filters.baseCurrency } : {}),
      },
      include: { currency: true },
      orderBy: { effectiveAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string | null, data: Omit<Prisma.ExchangeRateCreateInput, 'tenant'>) {
    return this.prisma.exchangeRate.create({
      data: {
        ...data,
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
      },
      include: { currency: true },
    });
  }

  update(tenantId: string | null, id: string, data: Prisma.ExchangeRateUpdateInput) {
    return this.prisma.exchangeRate.updateMany({
      where: {
        id,
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
      },
      data,
    });
  }

  softDelete(tenantId: string | null, id: string) {
    return this.prisma.exchangeRate.updateMany({
      where: {
        id,
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
      },
      data: softDeleteData(),
    });
  }

  listCache(tenantId: string | null) {
    return this.prisma.exchangeRateCache.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : { tenantId: null }),
      },
      include: { provider: true },
      orderBy: { fetchedAt: 'desc' },
    });
  }
}
