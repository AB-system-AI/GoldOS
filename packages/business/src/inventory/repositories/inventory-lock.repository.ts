import type { InventoryLockType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class InventoryLockRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.inventoryLock.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { inventoryItem: true, lockedBy: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      lockType?: InventoryLockType;
      activeOnly?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    const now = new Date();
    return this.prisma.inventoryLock.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.lockType ? { lockType: filters.lockType } : {}),
        ...(filters?.activeOnly
          ? {
              releasedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  countActive(tenantId: string, inventoryItemId: string) {
    const now = new Date();
    return this.prisma.inventoryLock.count({
      where: {
        ...tenantScope(tenantId),
        inventoryItemId,
        releasedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  findActiveByReference(
    tenantId: string,
    referenceType: string,
    referenceId: string,
    lockType?: InventoryLockType,
  ) {
    const now = new Date();
    return this.prisma.inventoryLock.findMany({
      where: {
        ...tenantScope(tenantId),
        referenceType,
        referenceId,
        releasedAt: null,
        ...(lockType ? { lockType } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryLockCreateInput, 'tenant'>) {
    return this.prisma.inventoryLock.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  release(tenantId: string, id: string) {
    return this.prisma.inventoryLock.updateMany({
      where: { id, ...tenantScope(tenantId), releasedAt: null },
      data: { releasedAt: new Date() },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.inventoryLock.updateMany({
      where: scopedIdWhere(tenantId, id),
      data: softDeleteData(),
    });
  }
}
