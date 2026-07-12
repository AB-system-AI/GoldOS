import type { Prisma, PrismaClient, SalesOrderStatus, PaymentStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class SalesOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.salesOrder.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { where: { deletedAt: null }, include: { product: true, inventoryItem: true } },
        customer: true,
        branch: true,
        employee: true,
        invoices: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      employeeId?: string;
      status?: SalesOrderStatus;
      paymentStatus?: PaymentStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.salesOrder.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
        ...(filters?.search
          ? { orderNo: { contains: filters.search, mode: 'insensitive' as const } }
          : {}),
      },
      include: { customer: true, branch: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.SalesOrderCreateInput, 'tenant'>) {
    return this.prisma.salesOrder.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SalesOrderUpdateInput) {
    const result = await this.prisma.salesOrder.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  createLine(salesOrderId: string, data: Omit<Prisma.SalesOrderLineCreateInput, 'salesOrder'>) {
    return this.prisma.salesOrderLine.create({
      data: { ...data, salesOrder: { connect: { id: salesOrderId } } },
    });
  }

  async updateLine(lineId: string, data: Prisma.SalesOrderLineUpdateInput) {
    return this.prisma.salesOrderLine.update({ where: { id: lineId }, data });
  }

  softDeleteLine(lineId: string) {
    return this.prisma.salesOrderLine.updateMany({
      where: { id: lineId },
      data: softDeleteData(),
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.salesOrder.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
