import type { AccountType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class ChartOfAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.chartOfAccount.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { parent: true, children: { where: { deletedAt: null } } },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.chartOfAccount.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      accountType?: AccountType;
      isActive?: boolean;
      parentId?: string | null;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.chartOfAccount.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.accountType ? { accountType: filters.accountType } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.parentId !== undefined ? { parentId: filters.parentId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { name: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { parent: true },
      orderBy: [{ code: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.ChartOfAccountCreateInput, 'tenant'>) {
    return this.prisma.chartOfAccount.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ChartOfAccountUpdateInput) {
    const result = await this.prisma.chartOfAccount.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.chartOfAccount.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
