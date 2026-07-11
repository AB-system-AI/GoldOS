import type { InventoryPriceType, Prisma, PrismaClient } from '@goldos/database';

export class PriceHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      priceType?: InventoryPriceType;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.inventoryPriceHistory.findMany({
      where: {
        tenantId,
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.priceType ? { priceType: filters.priceType } : {}),
      },
      include: { changedBy: true },
      orderBy: { effectiveAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryPriceHistoryCreateInput, 'tenant'>) {
    return this.prisma.inventoryPriceHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  findLatest(tenantId: string, inventoryItemId: string, priceType: InventoryPriceType) {
    return this.prisma.inventoryPriceHistory.findFirst({
      where: { tenantId, inventoryItemId, priceType },
      orderBy: { effectiveAt: 'desc' },
    });
  }
}
