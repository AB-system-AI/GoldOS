import type { Prisma, PrismaClient, StockMovementType } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class StockMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.stockMovement.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        inventoryItem: true,
        branch: true,
        performedBy: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      inventoryItemId?: string;
      type?: StockMovementType;
      referenceType?: string;
      referenceId?: string;
      occurredAfter?: Date;
      occurredBefore?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.stockMovement.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.referenceType ? { referenceType: filters.referenceType } : {}),
        ...(filters?.referenceId ? { referenceId: filters.referenceId } : {}),
        ...(filters?.occurredAfter ? { occurredAt: { gte: filters.occurredAfter } } : {}),
        ...(filters?.occurredBefore ? { occurredAt: { lte: filters.occurredBefore } } : {}),
      },
      include: { inventoryItem: true, branch: true },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.StockMovementCreateInput, 'tenant'>) {
    return this.prisma.stockMovement.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.StockMovementUpdateInput) {
    const result = await this.prisma.stockMovement.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.stockMovement.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
