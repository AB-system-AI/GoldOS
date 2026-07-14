import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.purchaseRequest.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { lines: { include: { product: true } }, branch: true, requestedBy: true },
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
    return this.prisma.purchaseRequest.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, branch: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseRequestCreateInput, 'tenant'>) {
    return this.prisma.purchaseRequest.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(
    purchaseRequestId: string,
    data: Omit<Prisma.PurchaseRequestLineCreateInput, 'purchaseRequest'>,
  ) {
    return this.prisma.purchaseRequestLine.create({
      data: { ...data, purchaseRequest: { connect: { id: purchaseRequestId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PurchaseRequestUpdateInput) {
    const result = await this.prisma.purchaseRequest.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.purchaseRequest.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
