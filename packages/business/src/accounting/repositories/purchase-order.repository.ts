import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { lines: { include: { product: true } }, supplier: true, branch: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      supplierId?: string;
      branchId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, supplier: true },
      orderBy: { orderDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseOrderCreateInput, 'tenant'>) {
    return this.prisma.purchaseOrder.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PurchaseOrderUpdateInput) {
    const result = await this.prisma.purchaseOrder.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.purchaseOrder.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
