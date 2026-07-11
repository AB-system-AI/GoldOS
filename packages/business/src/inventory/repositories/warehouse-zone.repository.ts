import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class WarehouseZoneRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.warehouseZone.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true },
    });
  }

  findByCode(tenantId: string, branchId: string, code: string) {
    return this.prisma.warehouseZone.findFirst({
      where: { branchId, code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      isActive?: boolean;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.warehouseZone.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { branch: true },
      orderBy: { code: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.WarehouseZoneCreateInput, 'tenant'>) {
    return this.prisma.warehouseZone.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.WarehouseZoneUpdateInput) {
    const result = await this.prisma.warehouseZone.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.warehouseZone.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
