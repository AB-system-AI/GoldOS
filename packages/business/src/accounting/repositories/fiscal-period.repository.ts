import type { AccountingPeriodStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, tenantScope } from '../../repositories/tenant-scope.js';

export class FiscalYearRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.fiscalYear.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { periods: { orderBy: { periodNo: 'asc' } } },
    });
  }

  findCurrent(tenantId: string) {
    return this.prisma.fiscalYear.findFirst({
      where: { ...tenantScope(tenantId), isCurrent: true },
      include: { periods: { orderBy: { periodNo: 'asc' } } },
    });
  }

  list(tenantId: string, filters?: { skip?: number; take?: number }) {
    return this.prisma.fiscalYear.findMany({
      where: tenantScope(tenantId),
      include: { periods: true },
      orderBy: { startDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.FiscalYearCreateInput, 'tenant'>) {
    return this.prisma.fiscalYear.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.FiscalYearUpdateInput) {
    const result = await this.prisma.fiscalYear.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}

export class AccountingPeriodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.accountingPeriod.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { fiscalYear: true },
    });
  }

  findOpenForDate(tenantId: string, date: Date) {
    return this.prisma.accountingPeriod.findFirst({
      where: {
        ...tenantScope(tenantId),
        status: 'OPEN',
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });
  }

  list(tenantId: string, filters?: { fiscalYearId?: string; status?: AccountingPeriodStatus }) {
    return this.prisma.accountingPeriod.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.fiscalYearId ? { fiscalYearId: filters.fiscalYearId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { periodNo: 'asc' },
    });
  }

  create(tenantId: string, data: Omit<Prisma.AccountingPeriodCreateInput, 'tenant'>) {
    return this.prisma.accountingPeriod.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.AccountingPeriodUpdateInput) {
    const result = await this.prisma.accountingPeriod.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}
