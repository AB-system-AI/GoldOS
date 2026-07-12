import type { CashierQueueStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class CashierQueueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.cashierQueueEntry.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        salesOrder: { include: { customer: true, lines: { where: { deletedAt: null } } } },
        seller: true,
        cashier: true,
        branch: true,
      },
    });
  }

  findBySalesOrderId(tenantId: string, salesOrderId: string) {
    return this.prisma.cashierQueueEntry.findFirst({
      where: { salesOrderId, ...tenantScope(tenantId) },
      include: { salesOrder: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: CashierQueueStatus | CashierQueueStatus[];
      cashierEmployeeId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const statuses = filters?.status
      ? Array.isArray(filters.status)
        ? filters.status
        : [filters.status]
      : undefined;

    return this.prisma.cashierQueueEntry.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(filters?.cashierEmployeeId ? { cashierEmployeeId: filters.cashierEmployeeId } : {}),
      },
      include: {
        salesOrder: { include: { customer: true } },
        seller: true,
        cashier: true,
      },
      orderBy: [{ priority: 'desc' }, { queuedAt: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  countWaiting(tenantId: string, branchId: string) {
    return this.prisma.cashierQueueEntry.count({
      where: {
        ...tenantScope(tenantId),
        branchId,
        status: { in: ['WAITING', 'CALLING'] },
      },
    });
  }

  create(tenantId: string, data: Omit<Prisma.CashierQueueEntryCreateInput, 'tenant'>) {
    return this.prisma.cashierQueueEntry.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { salesOrder: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CashierQueueEntryUpdateInput) {
    const result = await this.prisma.cashierQueueEntry.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.cashierQueueEntry.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
