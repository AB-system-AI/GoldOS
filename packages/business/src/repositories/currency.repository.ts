import type { Prisma, PrismaClient } from '@goldos/database';

import { activeOnly, softDeleteData } from './tenant-scope.js';

export class CurrencyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.currency.findFirst({
      where: { id, ...activeOnly() },
    });
  }

  findByCode(code: string) {
    return this.prisma.currency.findFirst({
      where: { code: code.toUpperCase(), ...activeOnly() },
    });
  }

  list(filters?: { isActive?: boolean; skip?: number; take?: number }) {
    return this.prisma.currency.findMany({
      where: {
        ...activeOnly(),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: { code: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(data: Prisma.CurrencyCreateInput) {
    return this.prisma.currency.create({ data });
  }

  async update(id: string, data: Prisma.CurrencyUpdateInput) {
    const result = await this.prisma.currency.updateMany({
      where: { id, ...activeOnly() },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  softDelete(id: string) {
    return this.prisma.currency.updateMany({
      where: { id, ...activeOnly() },
      data: softDeleteData(),
    });
  }
}
