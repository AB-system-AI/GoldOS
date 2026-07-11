import type { Prisma, PrismaClient } from '@goldos/database';

export class WeightHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.inventoryWeightHistory.findMany({
      where: {
        tenantId,
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
      },
      include: { measuredBy: true },
      orderBy: { measuredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryWeightHistoryCreateInput, 'tenant'>) {
    return this.prisma.inventoryWeightHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  findLatest(tenantId: string, inventoryItemId: string) {
    return this.prisma.inventoryWeightHistory.findFirst({
      where: { tenantId, inventoryItemId },
      orderBy: { measuredAt: 'desc' },
    });
  }
}
