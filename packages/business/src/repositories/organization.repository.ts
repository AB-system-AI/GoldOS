import type { OrganizationStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class OrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.organization.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { logoFile: true },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.organization.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: { status?: OrganizationStatus; search?: string; skip?: number; take?: number },
  ) {
    return this.prisma.organization.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
                { legalName: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.OrganizationCreateInput, 'tenant'>) {
    return this.prisma.organization.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.OrganizationUpdateInput) {
    const result = await this.prisma.organization.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.organization.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
