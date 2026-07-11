import type { Prisma, PrismaClient, ReservationStatus } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class ReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.reservation.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        customer: true,
        branch: true,
        inventoryItem: { include: { product: true } },
      },
    });
  }

  findByReservationNo(tenantId: string, reservationNo: string) {
    return this.prisma.reservation.findFirst({
      where: { reservationNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      customerId?: string;
      inventoryItemId?: string;
      status?: ReservationStatus;
      expiresBefore?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.reservation.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.customerId ? { customerId: filters.customerId } : {}),
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.expiresBefore ? { expiresAt: { lte: filters.expiresBefore } } : {}),
      },
      include: { customer: true, inventoryItem: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  countActiveForItem(tenantId: string, inventoryItemId: string) {
    return this.prisma.reservation.count({
      where: {
        ...tenantScope(tenantId),
        inventoryItemId,
        status: 'ACTIVE',
      },
    });
  }

  listExpiredActive(tenantId: string, asOf: Date = new Date()) {
    return this.prisma.reservation.findMany({
      where: {
        ...tenantScope(tenantId),
        status: 'ACTIVE',
        expiresAt: { lte: asOf },
      },
    });
  }

  create(tenantId: string, data: Omit<Prisma.ReservationCreateInput, 'tenant'>) {
    return this.prisma.reservation.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ReservationUpdateInput) {
    const result = await this.prisma.reservation.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.reservation.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
