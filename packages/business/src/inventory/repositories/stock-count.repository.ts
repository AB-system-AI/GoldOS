import type { Prisma, PrismaClient, StockCountStatus } from '@goldos/database';

import {
  activeOnly,
  scopedIdWhere,
  softDeleteData,
  tenantScope,
} from '../../repositories/tenant-scope.js';

export class StockCountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.stockCount.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        branch: true,
        lines: { where: activeOnly(), include: { inventoryItem: true } },
      },
    });
  }

  findByCountNo(tenantId: string, countNo: string) {
    return this.prisma.stockCount.findFirst({
      where: { countNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: StockCountStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.stockCount.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { lines: { where: activeOnly() } },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.StockCountCreateInput, 'tenant'>) {
    return this.prisma.stockCount.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.StockCountUpdateInput) {
    const result = await this.prisma.stockCount.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.stockCount.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  addLine(stockCountId: string, data: Omit<Prisma.StockCountLineCreateInput, 'stockCount'>) {
    return this.prisma.stockCountLine.create({
      data: { ...data, stockCount: { connect: { id: stockCountId } } },
    });
  }

  async updateLine(stockCountId: string, lineId: string, data: Prisma.StockCountLineUpdateInput) {
    const result = await this.prisma.stockCountLine.updateMany({
      where: { id: lineId, stockCountId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.stockCountLine.findFirst({
      where: { id: lineId, stockCountId },
    });
  }
}
