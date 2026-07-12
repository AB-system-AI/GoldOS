import type { ExpenseCategoryType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class ExpenseCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.expenseCategory.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { defaultAccount: true },
    });
  }

  list(tenantId: string, filters?: { categoryType?: ExpenseCategoryType; isActive?: boolean }) {
    return this.prisma.expenseCategory.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.categoryType ? { categoryType: filters.categoryType } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: { code: 'asc' },
    });
  }

  create(tenantId: string, data: Omit<Prisma.ExpenseCategoryCreateInput, 'tenant'>) {
    return this.prisma.expenseCategory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ExpenseCategoryUpdateInput) {
    const result = await this.prisma.expenseCategory.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.expenseCategory.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}

export class GoldCostRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByReference(tenantId: string, referenceType: string, referenceId: string) {
    return this.prisma.goldCostRecord.findMany({
      where: { ...tenantScope(tenantId), referenceType, referenceId },
    });
  }

  create(tenantId: string, data: Omit<Prisma.GoldCostRecordCreateInput, 'tenant'>) {
    return this.prisma.goldCostRecord.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}

export class ExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.expense.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true, expenseCategory: true, journalEntry: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.expense.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      orderBy: { expenseDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.ExpenseCreateInput, 'tenant'>) {
    return this.prisma.expense.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ExpenseUpdateInput) {
    const result = await this.prisma.expense.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}
