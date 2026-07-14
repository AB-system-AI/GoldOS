import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.purchaseInvoice.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { include: { product: true, purchaseOrderLine: true } },
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
    return this.prisma.purchaseInvoice.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters?.purchaseOrderId ? { purchaseOrderId: filters.purchaseOrderId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, supplier: true },
      orderBy: { invoiceDate: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseInvoiceCreateInput, 'tenant'>) {
    return this.prisma.purchaseInvoice.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(
    purchaseInvoiceId: string,
    data: Omit<Prisma.PurchaseInvoiceLineCreateInput, 'purchaseInvoice'>,
  ) {
    return this.prisma.purchaseInvoiceLine.create({
      data: { ...data, purchaseInvoice: { connect: { id: purchaseInvoiceId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PurchaseInvoiceUpdateInput) {
    const result = await this.prisma.purchaseInvoice.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.purchaseInvoice.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
