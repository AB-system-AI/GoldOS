import type { Prisma, PrismaClient, WorkshopStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class WorkshopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.workshop.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.workshop.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: { branchId?: string; status?: WorkshopStatus; skip?: number; take?: number },
  ) {
    return this.prisma.workshop.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.WorkshopCreateInput, 'tenant'>) {
    return this.prisma.workshop.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.WorkshopUpdateInput) {
    const result = await this.prisma.workshop.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.workshop.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
