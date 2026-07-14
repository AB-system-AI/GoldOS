import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class GoodsReceiptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.goodsReceipt.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: {
          include: {
            product: true,
            purchaseOrderLine: true,
            inventoryItem: true,
          },
        },
        purchaseOrder: { include: { lines: true } },
        supplier: true,
        branch: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      purchaseOrderId?: string;
      supplierId?: string;
      branchId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.goodsReceipt.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.purchaseOrderId ? { purchaseOrderId: filters.purchaseOrderId } : {}),
        ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, supplier: true, purchaseOrder: true },
      orderBy: { receiptDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.GoodsReceiptCreateInput, 'tenant'>) {
    return this.prisma.goodsReceipt.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(
    goodsReceiptId: string,
    data: Omit<Prisma.GoodsReceiptLineCreateInput, 'goodsReceipt'>,
  ) {
    return this.prisma.goodsReceiptLine.create({
      data: { ...data, goodsReceipt: { connect: { id: goodsReceiptId } } },
    });
  }

  async updateLine(
    goodsReceiptId: string,
    lineId: string,
    data: Prisma.GoodsReceiptLineUpdateInput,
  ) {
    return this.prisma.goodsReceiptLine.updateMany({
      where: { id: lineId, goodsReceiptId },
      data,
    });
  }

  async update(tenantId: string, id: string, data: Prisma.GoodsReceiptUpdateInput) {
    const result = await this.prisma.goodsReceipt.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.goodsReceipt.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
