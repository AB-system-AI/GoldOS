import type { Prisma, PrismaClient, PosSessionStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class PosSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.posSession.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true, employee: true, cashRegister: true },
    });
  }

  findOpenForEmployee(tenantId: string, employeeId: string, branchId?: string) {
    return this.prisma.posSession.findFirst({
      where: {
        ...tenantScope(tenantId),
        employeeId,
        status: 'OPEN',
        ...(branchId ? { branchId } : {}),
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      employeeId?: string;
      status?: PosSessionStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.posSession.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { openedAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PosSessionCreateInput, 'tenant'>) {
    return this.prisma.posSession.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PosSessionUpdateInput) {
    const result = await this.prisma.posSession.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.posSession.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
