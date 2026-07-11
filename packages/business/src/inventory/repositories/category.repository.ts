import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { parent: true, children: { where: tenantScope(tenantId) } },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.category.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      parentId?: string | null;
      isActive?: boolean;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.category.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.parentId !== undefined ? { parentId: filters.parentId } : {}),
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CategoryCreateInput, 'tenant'>) {
    return this.prisma.category.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CategoryUpdateInput) {
    const result = await this.prisma.category.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.category.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
