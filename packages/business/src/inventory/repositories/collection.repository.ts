import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class CollectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.collection.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.collection.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      year?: number;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.collection.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
        ...(filters?.year !== undefined ? { year: filters.year } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
                { season: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CollectionCreateInput, 'tenant'>) {
    return this.prisma.collection.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CollectionUpdateInput) {
    const result = await this.prisma.collection.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.collection.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
