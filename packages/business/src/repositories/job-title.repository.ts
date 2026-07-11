import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class JobTitleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.jobTitle.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.jobTitle.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(tenantId: string, filters?: { isActive?: boolean; skip?: number; take?: number }) {
    return this.prisma.jobTitle.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.JobTitleCreateInput, 'tenant'>) {
    return this.prisma.jobTitle.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.JobTitleUpdateInput) {
    const result = await this.prisma.jobTitle.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.jobTitle.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
