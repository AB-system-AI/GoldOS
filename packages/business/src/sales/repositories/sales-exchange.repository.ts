import type { Prisma, PrismaClient, SalesExchangeStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class SalesExchangeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.salesExchange.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { where: { deletedAt: null }, orderBy: { lineNo: 'asc' } },
        customer: true,
        branch: true,
        originalInvoice: { include: { items: { where: { deletedAt: null } } } },
        newInvoice: true,
        employee: true,
        approver: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      status?: SalesExchangeStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.salesExchange.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { customer: true, branch: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.SalesExchangeCreateInput, 'tenant'>) {
    return this.prisma.salesExchange.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SalesExchangeUpdateInput) {
    const result = await this.prisma.salesExchange.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  createLine(
    salesExchangeId: string,
    data: Omit<Prisma.SalesExchangeLineCreateInput, 'salesExchange'>,
  ) {
    return this.prisma.salesExchangeLine.create({
      data: { ...data, salesExchange: { connect: { id: salesExchangeId } } },
    });
  }

  softDeleteLine(id: string) {
    return this.prisma.salesExchangeLine.update({
      where: { id },
      data: softDeleteData(),
    });
  }
}
