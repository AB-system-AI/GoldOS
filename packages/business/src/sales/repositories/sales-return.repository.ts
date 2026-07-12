import type { Prisma, PrismaClient, SalesReturnStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class SalesReturnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.salesReturn.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { where: { deletedAt: null } },
        customer: true,
        invoice: { include: { items: true } },
        branch: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      invoiceId?: string;
      status?: SalesReturnStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.salesReturn.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.invoiceId ? { invoiceId: filters.invoiceId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { customer: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.SalesReturnCreateInput, 'tenant'>) {
    return this.prisma.salesReturn.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SalesReturnUpdateInput) {
    const result = await this.prisma.salesReturn.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  createLine(salesReturnId: string, data: Omit<Prisma.SalesReturnLineCreateInput, 'salesReturn'>) {
    return this.prisma.salesReturnLine.create({
      data: { ...data, salesReturn: { connect: { id: salesReturnId } } },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.salesReturn.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
