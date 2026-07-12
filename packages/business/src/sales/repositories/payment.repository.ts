import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.payment.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { invoice: true, branch: true, employee: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      invoiceId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.payment.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.invoiceId ? { invoiceId: filters.invoiceId } : {}),
      },
      include: { invoice: true },
      orderBy: { paidAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PaymentCreateInput, 'tenant'>) {
    return this.prisma.payment.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PaymentUpdateInput) {
    const result = await this.prisma.payment.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  sumForInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.payment.aggregate({
      where: { ...tenantScope(tenantId), invoiceId, deletedAt: null, status: 'PAID' },
      _sum: { amount: true },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.payment.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
