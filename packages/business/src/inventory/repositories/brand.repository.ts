import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class BrandRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.brand.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { logoFile: true },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.brand.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.brand.findMany({
      where: {
        ...tenantScope(tenantId),
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
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.BrandCreateInput, 'tenant'>) {
    return this.prisma.brand.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.BrandUpdateInput) {
    const result = await this.prisma.brand.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.brand.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
