import type { Prisma, PrismaClient } from '@goldos/database';

export class LifecycleEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.assetLifecycleEvent.findFirst({
      where: { id, tenantId },
      include: { inventoryItem: true, performedBy: true, branch: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      branchId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.assetLifecycleEvent.findMany({
      where: {
        tenantId,
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      },
      include: { performedBy: true },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.AssetLifecycleEventCreateInput, 'tenant'>) {
    return this.prisma.assetLifecycleEvent.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
