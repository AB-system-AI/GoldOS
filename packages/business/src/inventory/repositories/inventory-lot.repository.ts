import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class InventoryLotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.inventoryLot.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        inventoryItems: { where: tenantScope(tenantId), take: 100 },
      },
    });
  }

  findByLotNumber(tenantId: string, lotNumber: string) {
    return this.prisma.inventoryLot.findFirst({
      where: { lotNumber, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      search?: string;
      receivedAfter?: Date;
      receivedBefore?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.inventoryLot.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.receivedAfter ? { receivedAt: { gte: filters.receivedAfter } } : {}),
        ...(filters?.receivedBefore ? { receivedAt: { lte: filters.receivedBefore } } : {}),
        ...(filters?.search
          ? {
              OR: [
                { lotNumber: { contains: filters.search, mode: 'insensitive' } },
                { supplierRef: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { receivedAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryLotCreateInput, 'tenant'>) {
    return this.prisma.inventoryLot.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.InventoryLotUpdateInput) {
    const result = await this.prisma.inventoryLot.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.inventoryLot.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  async incrementTotalPieces(tenantId: string, id: string, delta = 1) {
    const result = await this.prisma.inventoryLot.updateMany({
      where: scopedIdWhere(tenantId, id),
      data: { totalPieces: { increment: delta } },
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}
