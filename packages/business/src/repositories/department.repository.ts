import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class DepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.department.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { parent: true, children: { where: tenantScope(tenantId) } },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.department.findFirst({
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
    return this.prisma.department.findMany({
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
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.DepartmentCreateInput, 'tenant'>) {
    return this.prisma.department.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.DepartmentUpdateInput) {
    const result = await this.prisma.department.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.department.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
