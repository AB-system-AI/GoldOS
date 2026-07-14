import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseReturnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.purchaseReturn.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { include: { product: true, inventoryItem: true } },
        supplier: true,
        purchaseOrder: true,
        goodsReceipt: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      supplierId?: string;
      purchaseOrderId?: string;
      branchId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.purchaseReturn.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters?.purchaseOrderId ? { purchaseOrderId: filters.purchaseOrderId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, supplier: true },
      orderBy: { returnDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseReturnCreateInput, 'tenant'>) {
    return this.prisma.purchaseReturn.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(
    purchaseReturnId: string,
    data: Omit<Prisma.PurchaseReturnLineCreateInput, 'purchaseReturn'>,
  ) {
    return this.prisma.purchaseReturnLine.create({
      data: { ...data, purchaseReturn: { connect: { id: purchaseReturnId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PurchaseReturnUpdateInput) {
    const result = await this.prisma.purchaseReturn.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.purchaseReturn.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
