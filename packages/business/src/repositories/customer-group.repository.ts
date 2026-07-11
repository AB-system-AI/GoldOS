import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class CustomerGroupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.customerGroup.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { _count: { select: { customers: true } } },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.customerGroup.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(tenantId: string, filters?: { isActive?: boolean; skip?: number; take?: number }) {
    return this.prisma.customerGroup.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CustomerGroupCreateInput, 'tenant'>) {
    return this.prisma.customerGroup.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CustomerGroupUpdateInput) {
    const result = await this.prisma.customerGroup.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.customerGroup.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
