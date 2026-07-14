import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class SupplierQuotationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.supplierQuotation.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: { include: { product: true } },
        supplier: true,
        purchaseRfq: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      supplierId?: string;
      purchaseRfqId?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.supplierQuotation.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(filters?.purchaseRfqId ? { purchaseRfqId: filters.purchaseRfqId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { lines: true, supplier: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.SupplierQuotationCreateInput, 'tenant'>) {
    return this.prisma.supplierQuotation.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  createLine(
    supplierQuotationId: string,
    data: Omit<Prisma.SupplierQuotationLineCreateInput, 'supplierQuotation'>,
  ) {
    return this.prisma.supplierQuotationLine.create({
      data: { ...data, supplierQuotation: { connect: { id: supplierQuotationId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SupplierQuotationUpdateInput) {
    const result = await this.prisma.supplierQuotation.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.supplierQuotation.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
