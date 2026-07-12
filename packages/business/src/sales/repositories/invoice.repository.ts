import type { Prisma, PrismaClient, InvoiceStatus, PaymentStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class InvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        items: { where: { deletedAt: null }, include: { product: true, inventoryItem: true } },
        customer: true,
        branch: true,
        employee: true,
        payments: { where: { deletedAt: null } },
        salesOrder: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      status?: InvoiceStatus;
      paymentStatus?: PaymentStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.invoice.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
        ...(filters?.search
          ? { invoiceNo: { contains: filters.search, mode: 'insensitive' as const } }
          : {}),
      },
      include: { customer: true, branch: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InvoiceCreateInput, 'tenant'>) {
    return this.prisma.invoice.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { items: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.InvoiceUpdateInput) {
    const result = await this.prisma.invoice.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  createItem(invoiceId: string, data: Omit<Prisma.InvoiceItemCreateInput, 'invoice'>) {
    return this.prisma.invoiceItem.create({
      data: { ...data, invoice: { connect: { id: invoiceId } } },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.invoice.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
