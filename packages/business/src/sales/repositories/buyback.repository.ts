import type { Prisma, PrismaClient, BuybackTransactionStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class BuybackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.buybackTransaction.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { customer: true, branch: true, employee: true, inventoryItem: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      status?: BuybackTransactionStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.buybackTransaction.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.BuybackTransactionCreateInput, 'tenant'>) {
    return this.prisma.buybackTransaction.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.BuybackTransactionUpdateInput) {
    const result = await this.prisma.buybackTransaction.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.buybackTransaction.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
