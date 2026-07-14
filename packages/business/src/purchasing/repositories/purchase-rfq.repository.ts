import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseRfqRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.purchaseRfq.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { include: { product: true } },
        invitedSuppliers: { include: { supplier: true } },
        quotations: { include: { supplier: true } },
        purchaseRequest: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: string;
      purchaseRequestId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.purchaseRfq.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.purchaseRequestId ? { purchaseRequestId: filters.purchaseRequestId } : {}),
      },
      include: { lines: true, invitedSuppliers: { include: { supplier: true } } },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseRfqCreateInput, 'tenant'>) {
    return this.prisma.purchaseRfq.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(purchaseRfqId: string, data: Omit<Prisma.PurchaseRfqLineCreateInput, 'purchaseRfq'>) {
    return this.prisma.purchaseRfqLine.create({
      data: { ...data, purchaseRfq: { connect: { id: purchaseRfqId } } },
    });
  }

  addSupplier(tenantId: string, purchaseRfqId: string, supplierId: string) {
    return this.prisma.purchaseRfqSupplier.create({
      data: {
        tenant: { connect: { id: tenantId } },
        purchaseRfq: { connect: { id: purchaseRfqId } },
        supplier: { connect: { id: supplierId } },
      },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PurchaseRfqUpdateInput) {
    const result = await this.prisma.purchaseRfq.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  markSuppliersSent(purchaseRfqId: string) {
    return this.prisma.purchaseRfqSupplier.updateMany({
      where: { purchaseRfqId, sentAt: null },
      data: { sentAt: new Date() },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.purchaseRfq.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
