import type { CashRegisterShiftStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, tenantScope } from '../../repositories/tenant-scope.js';

export class CashRegisterShiftRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.cashRegisterShift.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { cashRegister: true, employee: true, movements: true },
    });
  }

  findOpenShift(tenantId: string, cashRegisterId: string) {
    return this.prisma.cashRegisterShift.findFirst({
      where: { ...tenantScope(tenantId), cashRegisterId, status: 'OPEN' },
    });
  }

  list(
    tenantId: string,
    filters?: { branchId?: string; status?: CashRegisterShiftStatus; skip?: number; take?: number },
  ) {
    return this.prisma.cashRegisterShift.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { employee: true, cashRegister: true },
      orderBy: { openedAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CashRegisterShiftCreateInput, 'tenant'>) {
    return this.prisma.cashRegisterShift.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CashRegisterShiftUpdateInput) {
    const result = await this.prisma.cashRegisterShift.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}

export class CashMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      shiftId?: string;
      cashRegisterId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.cashMovement.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.shiftId ? { shiftId: filters.shiftId } : {}),
        ...(filters?.cashRegisterId ? { cashRegisterId: filters.cashRegisterId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CashMovementCreateInput, 'tenant'>) {
    return this.prisma.cashMovement.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
